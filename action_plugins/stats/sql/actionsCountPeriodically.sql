with query as (
	select 
	date_trunc(:periodicity, log_date) as log_date_rs, 
	count(*) as actions_count
	from usage_log
	--where action_type in ('CREATE','CREATE_VARIATION','COPY','COPY_VERSION') and 
	where action_type in (:action_types) and 
	log_date > :period_start::TIMESTAMP and 
	log_date <= :period_end::TIMESTAMP
	group by log_date_rs
	order by log_date_rs
	limit :num::BIGINT
)
select ds.log_date_rs, q.actions_count
from (
	select generate_series(date_trunc(:periodicity, :period_start::TIMESTAMP), :period_end::TIMESTAMP, :gs_periodicity::INTERVAL) as log_date_rs
	from query
) ds
left join query q on q.log_date_rs = ds.log_date_rs
group by ds.log_date_rs, q.actions_count
order by ds.log_date_rs
	