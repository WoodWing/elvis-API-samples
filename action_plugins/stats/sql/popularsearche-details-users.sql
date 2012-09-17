select count(user_name) as weight, user_name as name
from search_log 
where 
log_date >= :period_start::TIMESTAMP 
and 
log_date <= :period_end::TIMESTAMP 
and 
user_query = :query
group by user_name
order by weight DESC 
limit :num::BIGINT