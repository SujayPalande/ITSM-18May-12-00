# This PowerShell script will move all identified unnecessary files/folders to __SAFE_TO_DELETE__
# Review your project after running this script. If everything works, you can delete the __SAFE_TO_DELETE__ folder.

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$dest = Join-Path $root "__SAFE_TO_DELETE__"
if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest }

$items = @(
  # Debug, test, and output files
  'check_all_shivams.php','check_api_comments.php','check_comments_table.php','check_db_checkins.php','check_hash.php','check_rohan.php','check_roles.php','check_se_profiles.php','check_ticket_owners.php','check_users_exist.php',
  'cleanup_checkins.php','debug_checkins.php','debug_cleanup.php','debug_domains_api.php','debug_mail.php','debug_profiles.php','debug_registration.php','debug_shivam.php','debug_table.php','debug_tickets_web.php','debug_today.php','debug_user_deletion.php','debug_users_query.php',
  'delete-account.html','describe_bug_table.php','domains_diagnostic.php','dump_assignments.php','dump_checkins.php','dump_columns.php','dump_latest_checkins.php','dump_profiles.php','dump_schema.php','dump_schema_to_file.php','dump_today_checkins.php',
  'final_deletion_test.php','find_specific_hashes.php','find_user_of_hash.php','history.txt','list_hashes.php','list_profiles.php','nuke_shivam.php','output_payload.json','profiles_out.txt','server_log.txt','test-config.html','test_connection.js','test_credentials.php','test_deletion_email.php','test_domains_api.php','test_domain_id_extraction.php','test_dynamic_domains.php','test_email_notifications.php','test_email_notifications_enhanced.php','test_hitesh_login.php','test_mail_app.php','test_php_conn.php','test_rohan_mail.php','test_session.php','test_tickets_api.php','test_users_api.php','test_user_update.php','test_zoho.php','trace_final.php','trace_tickets.php','user_check.txt','tickets_api_debug.log',
  # Backups, dumps, and logs
  'api (4).zip','api.zip','backup_before_deploy.php','build_log.txt','columns.txt','se_assignments_dump.json','se_assignments_schema.txt','se_checkins_dump.json','se_clients_schema.txt',
  # Database and migration scripts
  'add_master_companies.sql','create_domains_table.sql','cybaemtechin_itsm_helpdesk (6).sql','cybaemtechin_itsm_helpdesk (7).sql','cybaemtechin_itsm_helpdesk (8).sql','mysql_schema.sql','update_categories_database.sql','supabase-sql-queries.sql',
  # Miscellaneous
  '.htaccess.backup','.htaccess.minimal','replit.nix','netlify.toml','vercel.json','drizzle.config.ts','image (4).jpg','newfavicon.png','cpanel_deployment_fix.php','fix_db_schema.php','fix_domains_500_error.php','fix_domain_auth.php','fix_registration.php','fix_registration_test.php','fix_roles.php','fix_ssl_chain.ps1','fix_user.php','setup_domains_table.php','setup_iis_binding.ps1','setup_iis_https_chain.ps1','restore_categories.php','restore_default_categories.php','safe_categories_update.php','update_clients.php','update_shivam_role.php','update_user_roles.php',
  # Folders
  'temp_restore','cybaemtech','deployment','deployment_package','tmp'
)

foreach ($item in $items) {
  $src = Join-Path $root $item
  if (Test-Path $src) {
    Move-Item $src $dest -Force
  }
}

Write-Host "All selected files/folders have been moved to __SAFE_TO_DELETE__. Please verify your project and delete this folder if everything works fine." -ForegroundColor Green
