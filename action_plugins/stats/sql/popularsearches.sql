select count(user_query) as weight, user_query as text
from search_log 
where 
log_date >= :period_start::TIMESTAMP 
and 
log_date <= :period_end::TIMESTAMP 
and 
user_query is not null 
group by user_query 
order by weight DESC 
limit :num::BIGINT