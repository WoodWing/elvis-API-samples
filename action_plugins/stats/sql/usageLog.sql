select 
case when :group_by_user_name::BOOLEAN then user_name else null end as user_name_rs,
case when :group_by_user_groups::BOOLEAN then user_groups else null end as user_groups_rs,
case when :group_by_client_type::BOOLEAN then client_type else null end as client_type_rs,
case when :group_by_asset_domain::BOOLEAN then asset_domain else null end as asset_domain_rs,
count(*) as count_rs
from usage_log
where action_type in (:action_type) and 
log_date >= :period_start::TIMESTAMP and 
log_date < :period_end::TIMESTAMP
/*and client_type is not null*/
group by user_name_rs, user_groups_rs, client_type_rs, asset_domain_rs
