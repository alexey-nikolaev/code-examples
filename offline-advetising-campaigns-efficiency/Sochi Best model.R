# https://www.periscopedata.com/app/wheely/115382/Advertising-Efficiency
library(readr)
data <- read_csv('https://www.periscopedata.com/api/wheely/chart/csv/b5c6885f-6bef-24a1-7fee-6fdcfd3c5ab5')

library(CausalImpact) # based on BSTS
library(bsts) # BSTS
library(forecast) # auto.ARIMA

data$mm <- format(data$dd, "%m")
mm <- model.matrix( ~ mm - 1, data=data)
data <- cbind(data,mm) # add month dummies for ARIMA

pre <- subset(data, dd<as.Date("2017-02-13")) 
post <- subset(data, dd>=as.Date("2017-02-13"))

for (metric in c('revenue', 'rides', 'riders', 'firstrides', 'secondrides', 'newusers', 
                'businessrides', 'businessfirstrides', 'quotes',
                'quotedusers', 'ridesairport', 'ridesfromairport',
                'businessridesairport', 'businessridesfromairport')) {
  
  models <- list()
  results <- list()
  mean_abs_residuals <- list()
  
  # the dataset will be divided in two parts: before the campaign started (pre) and after (post)
  if(metric %in% c('quotes','quotedusers')) { # correct quotes calculations started from 2016-06-18
    pre <- subset(data, dd>as.Date("2016-06-17"))
    pre <- subset(pre, dd<as.Date("2017-02-13"))
  } else {
    pre <- subset(data, dd<as.Date("2017-02-13"))
  }
  
  post <- subset(data, dd>=as.Date("2017-02-13"))
  
  # use business online cars for business orders
  if((metric == 'businessrides') || (metric == 'businessfirstrides')
     || (metric == 'businessridesairport') || (metric == 'businessridesfromairport')) {
    onlinecars <- pre$onlinebusinesscars
    onlinecarsf <-post$onlinebusinesscars
  } else {
    onlinecars <- pre$onlinecars
    onlinecarsf <-post$onlinecars
  }
  
  # loop through models (BSTS with different trends & auto.ARIMA)
  for (i in 1:4) {
    
    if (i == 4) { # auto.ARIMA
      errorflag <- FALSE # some auto.ARIMA models can't be fitted, skip then
      y <- ts(pre[[metric]], frequency = 7)
      
      xreg <- cbind(pre$isholiday, pre$previouscampaigns, onlinecars,
                    pre$mm01, pre$mm02, pre$mm03, pre$mm04, pre$mm05, pre$mm06,
                    pre$mm07, pre$mm08, pre$mm09, pre$mm10, pre$mm11)
      colnames(xreg) <- c("isholiday", "previouscampaigns", "onlinecars",
                          "m1", "m2", "m3", "m4", "m5", "m6",
                          "m7", "m8", "m9", "m10", "m11")
      
      xregf <- cbind(post$isholiday, post$previouscampaigns, onlinecarsf,
                     post$mm01, post$mm02, post$mm03, post$mm04, post$mm05, post$mm06,
                     post$mm07, post$mm08, post$mm09, post$mm10, post$mm11)
      colnames(xregf) <- c("isholiday", "previouscampaigns", "onlinecars",
                           "m1", "m2", "m3", "m4", "m5", "m6",
                           "m7", "m8", "m9", "m10", "m11")
      
      tryCatch(models[[i]] <- auto.arima(y, xreg=xreg, seasonal=TRUE),
               error=function(e){ errorflag <<- TRUE })
      # skip if model can't be fitted
      
      if (errorflag) {
        mean_abs_residuals[[i]] <- Inf # exclude model from comparison if an error occured
      } else {
        fc <- forecast(models[[i]], xreg=xregf, h=dim(post)[1])
        results[[i]] <- fc
        mean_abs_residuals[[i]] <- mean(abs(residuals(models[[i]], type='response', h=1)))
      }
      
    } else { # BSTS
      
      target <- xts(data[[metric]], order.by=data$dd)
      target_pre <- xts(pre[[metric]], order.by=pre$dd)
      target_post <- post[[metric]]
      
      if (i == 1) {
        ss <- AddLocalLinearTrend(list(), target_pre)
      } else if (i == 2) {
        ss <- AddGeneralizedLocalLinearTrend(list(), target_pre)
      } else if (i == 3) {
        ss <- AddStudentLocalLinearTrend(list(), target_pre)
      }
      
      ss <- AddSeasonal(ss, y = target_pre, nseasons=7)
      ss <- AddSeasonal(ss, y = target_pre, nseasons = 52, season.duration = 7)
      
      target_bsts <- xts(c(pre[[metric]], rep(NA, length(post[[metric]]))),
                         order.by=c(pre$dd,post$dd))
      
      cars <- c(onlinecars, onlinecarsf)
      isholiday <- c(pre$isholiday, post$isholiday)
      previouscampaigns <- c(pre$previouscampaigns, post$previouscampaigns)
      
      models[[i]] <- bsts(target_bsts ~ cars + isholiday + previouscampaigns, 
                    niter = 5000, state.specification=ss, seed=1)
      
      results[[i]] <- CausalImpact(bsts.model = models[[i]],
                             post.period.response = target_post)
      
      mean_abs_residuals[[i]] <- mean(abs(bsts.prediction.errors(models[[i]])))
      
    }
  }
  
  model_types <- c('BSTS LocalLinearTrend', 'BSTS GeneralizedLocalLinearTrend', 'BSTS StudentLocalLinearTrend', 'auto.ARIMA')
  best_model <- models[[which.min(mean_abs_residuals)]]
  best_model_type <- model_types[[which.min(mean_abs_residuals)]]
  result_best_model <- results[[which.min(mean_abs_residuals)]]
  
  cat(sprintf("\n\n\nMetric: %s", metric), file='report_sochi.txt', append=TRUE)
  cat(sprintf("\n\nBest model: %s\n\n", best_model_type), file='report_sochi.txt', append=TRUE)
  
  if (best_model_type == 'auto.ARIMA') {
    
    upper <- post[[metric]]-result_best_model$lower[,2]
    mean <- post[[metric]]-result_best_model$mean
    lower <- post[[metric]]-result_best_model$upper[,2]
    
    upper80 <- post[[metric]]-result_best_model$lower[,1]
    lower80 <- post[[metric]]-result_best_model$upper[,1]
    
    cat(sprintf("Average effect size: %.2f\nCI 95 [%.2f, %.2f]\nCI 80 [%.2f, %.2f]",
                mean(mean), mean(lower), mean(upper), mean(lower80), mean(upper80)),
                file='report_sochi.txt', append=TRUE)
    cat(sprintf("\n\nCumulative effect size: %.2f\nCI 95 [%.2f, %.2f]\nCI 80 [%.2f, %.2f]",
                sum(mean), sum(lower), sum(upper), sum(lower80), sum(upper80)),
                file='report_sochi.txt', append=TRUE)
    
  } else {
    
    sink(file = 'report_sochi.txt', append=TRUE)
    summary(result_best_model)
    sink()
    
  }
  
  png(paste0("sochi_", metric, ".png"), 
      width=8, height=3, units="in", res=700, pointsize=10)
  par(mar=c(6, 4, 4, 2) + 0.1)
  
  if (best_model_type == 'auto.ARIMA') {
    
    fc_xts <- xts(c(fitted(best_model), result_best_model$mean), order.by=c(pre$dd, post$dd))
    plot(target, main=metric, major.format = "%Y-%m")
    lines(fc_xts, major.format = "%Y-%m", col='blue', lty=2)
    
  } else {
    
    plot(as.xts(result_best_model$series$response), main=metric, major.format = "%Y-%m")
    lines(as.xts(result_best_model$series$point.pred), major.format = "%Y-%m", col='blue', lty=2)
    
  }
  
  legend('topleft', legend=c('actual', 'baseline forecast', 'campaign start'), 
         col=c('black', 'blue', 'red'), lwd=c(1,1,3), lty=c(1,2,1), cex=1, pt.cex=1)
  par(col='red', lwd=3)
  abline(v=.index(target)[length(target)-length(post)])
  par(col='black', lwd=1)
  
  dev.off()
}