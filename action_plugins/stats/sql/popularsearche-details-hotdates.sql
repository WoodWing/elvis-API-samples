select count(user_name) as weight, to_char(log_date,'DD Mon YYYY') as log_date
from search_log 
where 
log_date >= :period_start::TIMESTAMP 
and 
log_date <= :period_end::TIMESTAMP 
and 
user_query = :query
group by to_char(log_date,'DD Mon YYYY')
order by weight DESC 
limit :num::BIGINT