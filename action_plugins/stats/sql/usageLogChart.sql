with query as (
    select 
    date_trunc(:periodicity, log_date) as action_date_rs, 
    case when :group_by_user_name::BOOLEAN then user_name else null end as user_name_rs,
    case when :group_by_user_groups::BOOLEAN then user_groups else null end as user_groups_rs,
    case when :group_by_client_type::BOOLEAN then client_type else null end as client_type_rs,
    case when :group_by_asset_domain::BOOLEAN then asset_domain else null end as asset_domain_rs,
    count(*) as download_count
    from usage_log
    where action_type in (:action_type) and 
    log_date >= :period_start::TIMESTAMP and 
    log_date < :period_end::TIMESTAMP
    group by action_date_rs, user_name_rs, user_groups_rs, client_type_rs, asset_domain_rs
    order by action_date_rs
    limit :num::BIGINT
)
select ds.action_date_rs, q.user_name_rs, q.user_groups_rs, q.client_type_rs, q.asset_domain_rs, q.download_count
from (
    select generate_series(date_trunc(:periodicity, :period_start::TIMESTAMP), :period_end::TIMESTAMP, :gs_periodicity::INTERVAL) as action_date_rs
    from query
) ds
left join query q on q.action_date_rs = ds.action_date_rs
group by ds.action_date_rs, q.user_name_rs, q.user_groups_rs, q.client_type_rs, q.asset_domain_rs, q.download_count
order by ds.action_date_rs
