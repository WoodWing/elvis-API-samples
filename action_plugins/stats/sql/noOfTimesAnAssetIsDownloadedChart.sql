select 
date_trunc('day', action_date) as action_date_rs, 
case when :group_by_user_name::BOOLEAN then user_name else null end as user_name_rs,
case when :group_by_user_groups::BOOLEAN then user_groups else null end as user_groups_rs,
case when :group_by_client_type::BOOLEAN then client_type else null end as client_type_rs,
case when :group_by_asset_type::BOOLEAN then asset_domain else null end as asset_type_rs,
count(*) as download_count
from usage_log
where action_type = 'DOWNLOAD' and 
action_date >= :period_start::TIMESTAMP and 
action_date < :period_end::TIMESTAMP
group by action_date_rs, user_name_rs, user_groups_rs, client_type_rs, asset_type_rs
order by action_date_rs
limit :num::BIGINT
