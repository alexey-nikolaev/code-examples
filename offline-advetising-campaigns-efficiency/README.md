Offline advertising campaings efficiency evaluation with time-series modeling (CausalImpact, BSTS, ARIMA) in R, by city.

Example (Saint-Petersburg, riders):

Metric: riders

Best model: BSTS GeneralizedLocalLinearTrend

Posterior inference {CausalImpact}

                         Average       Cumulative   
Actual                   278           8066         
Prediction (s.d.)        255 (60)      7388 (1726)  
95% CI                   [135, 368]    [3928, 10677]
                                                    
Absolute effect (s.d.)   23 (60)       678 (1726)   
95% CI                   [-90, 143]    [-2611, 4138]
                                                    
Relative effect (s.d.)   9.2% (23%)    9.2% (23%)   
95% CI                   [-35%, 56%]   [-35%, 56%]  

Posterior tail-area probability p:   0.35317
Posterior prob. of a causal effect:  65%

For more details, type: summary(impact, "report")

![chart_example](https://github.com/alexey-nikolaev/code-examples/blob/master/offline-advetising-campaigns-efficiency/Spb/spb_riders.png?raw=true)
