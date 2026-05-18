# This PowerShell script will move debug/test/unneeded files from the php folder to __SAFE_TO_DELETE_PHP__ for safe review.
# Review your project after running this script. If everything works, you can delete the __SAFE_TO_DELETE_PHP__ folder.

$phpRoot = Join-Path $PSScriptRoot 'php'
$dest = Join-Path $phpRoot '__SAFE_TO_DELETE_PHP__'
if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest }

$items = @(
  # Debug/check scripts
  'check_24h.php','check_admins.php','check_all_checkins.php','check_aniket.php','check_any_today.php','check_api_count.php','check_api_response.php','check_assignments.php','check_counts.php','check_dates.php','check_db_time.php','check_duplicates.php','check_email.php','check_final.php','check_krishna_data.php','check_last_50.php','check_latest_globally.php','check_nisha.php','check_profiles.php','check_recent_attendance.php','check_sachin_jadhav.php','check_schema.php','check_schemas.php','check_sessions.php','check_se_sachin.php','check_shivam.php','check_sql_time.php','check_sujay.php','check_sujay_history.php','check_sujay_individual.php','check_sujay_records.php','check_today.php','check_today_checkins.php','check_today_final_final.php','check_users_attendance.php','check_user_db.php','check_verified.php','check_zoho_auth.php','check_zoho_ganesh.php','check_zoho_scopes.php',
  # Debug scripts
  'debug_api_response.php','debug_nisha.php',
  # Test scripts
  'test_api_payload.php','test_attendance_by_id.php','test_attendance_endpoints.php','test_attendance_new_scopes.php','test_attendance_sync.php','test_curl.php','test_digest.php','test_email.php','test_individual_attendance.php','test_internal.php','test_manual_checkin.php','test_payload_filter.php','test_session_sync.php','test_ticket_email.php','test_webhook_logic.php','test_zoho_attendance.php','test_zoho_attendance_forms.php','test_zoho_attendance_full.php','test_zoho_detail.php','test_zoho_employees.php','test_zoho_forms.php','test_zoho_past.php',
  # Miscellaneous
  'cleanup.php','cleanup_manual.php','deep_check.php','find_attendance_form.php','find_attendance_form_v2.php','find_krishna.php','find_krushna.php','find_krushna_detailed.php','find_praj.php','find_users.php','fix_orphans.php','get_krishna_details.php','get_sample_user.php','import_praj_engineers.php','insert_manual_sujay.php','list_dbs.php','list_tables.php','list_zoho_forms.php','manual_exchange.php','merge_sujay.php','simulate_api.php','site-engg-storage.json','sync_attendance_manual.php','verify_engineers.php','view_sujay.php'
)

foreach ($item in $items) {
  $src = Join-Path $phpRoot $item
  if (Test-Path $src) {
    Move-Item $src $dest -Force
  }
}

Write-Host "All selected files/folders from php have been moved to __SAFE_TO_DELETE_PHP__. Please verify your project and delete this folder if everything works fine." -ForegroundColor Green
