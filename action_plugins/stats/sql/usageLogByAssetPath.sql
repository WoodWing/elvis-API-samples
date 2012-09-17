SELECT action_date, action_type, asset_id, asset_path, changed_metadata FROM usage_log 
WHERE asset_path like :asset_path
ORDER BY action_date 
LIMIT :num::BIGINT 
OFFSET :start::BIGINT