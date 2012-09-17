select max(total_results),  round(avg(total_results), 0) as avg, min(total_results)
from search_log 
where 
log_date >= :period_start::TIMESTAMP 
and 
log_date <= :period_end::TIMESTAMP 
and 
user_query = :query
group by user_query