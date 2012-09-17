select count(*) as actions_count
from usage_log
where action_type in (:action_types) and 
log_date > :period_start::TIMESTAMP and 
log_date <= :period_end::TIMESTAMP
