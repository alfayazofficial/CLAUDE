# Test report

Run date: 2026-10-16 · Python 3.13 (logic) and 3.12 + Xvfb (Tk GUI) · all devices are simulators on loopback with synthetic data.

## What was demonstrated end to end (GUI against simulators)
- Start demo simulators -> two devices appear -> **Poll all now** stores 12 attendance punches + 1 sensor reading.
- Second poll stores **no duplicates**; after one new simulated punch the next poll stores exactly 1 (13 total).
- CSV export contains every stored record. Stopping the demo removes demo devices; closing the app stops the simulators.
- Offline device, Modbus without register map, invalid register-map JSON, and custom register map are each handled and shown in the UI.

## Not covered (be honest before real use)
- No real fingerprint terminal or medical sensor was available. Modbus TCP uses the real protocol; the attendance protocol (`SIM-ATT/1`) is a demo format and real terminals need a vendor-specific adapter.
- Windows `.bat`/`.exe` build not run in this environment. HL7/DICOM/OPC UA remain scaffolds. Not a certified medical device.

## Logic, protocol and integration tests (Python 3.13, no display)
```
........................................................................ [ 87%]
..........                                                               [100%]
=========================== short test summary info ============================
SKIPPED [1] tests/gui/test_desktop_app.py:3: could not import 'tkinter': No module named 'tkinter'
82 passed, 1 skipped in 6.06s
```

## Full suite including real Tk GUI driven against the simulators (Python 3.12, Xvfb)
```
tests/gui/test_desktop_app.py::test_starts_with_six_tabs PASSED         
tests/gui/test_desktop_app.py::test_scan_requires_authorization PASSED  
tests/gui/test_desktop_app.py::test_scan_rejects_public_range_and_reenables_button PASSED
tests/gui/test_desktop_app.py::test_scan_worker_crash_reenables_button PASSED
tests/gui/test_desktop_app.py::test_real_loopback_scan_end_to_end PASSED
tests/gui/test_desktop_app.py::test_selection_survives_auto_refresh PASSED
tests/gui/test_desktop_app.py::test_configure_selected_prefills_form PASSED
tests/gui/test_desktop_app.py::test_save_and_remove_connector PASSED    
tests/gui/test_desktop_app.py::test_invalid_port_not_saved[abc] PASSED  
tests/gui/test_desktop_app.py::test_invalid_port_not_saved[0] PASSED    
tests/gui/test_desktop_app.py::test_invalid_port_not_saved[70000] PASSED
tests/gui/test_desktop_app.py::test_missing_name_not_saved PASSED       
tests/gui/test_desktop_app.py::test_incoming_preview_and_errors PASSED  
tests/gui/test_desktop_app.py::test_corrupt_config_is_preserved_not_destroyed PASSED
tests/gui/test_desktop_app.py::test_save_config_is_atomic PASSED        
tests/gui/test_desktop_app.py::test_fhir_button_handles_empty_url PASSED
tests/gui/test_desktop_app.py::test_live_tab_exists PASSED              
tests/gui/test_desktop_app.py::test_poll_with_no_devices_explains PASSED
tests/gui/test_desktop_app.py::test_demo_end_to_end PASSED              
tests/gui/test_desktop_app.py::test_offline_device_shows_failure PASSED 
tests/gui/test_desktop_app.py::test_modbus_without_register_map_is_reported PASSED
tests/gui/test_desktop_app.py::test_bad_register_map_json_rejected PASSED
tests/gui/test_desktop_app.py::test_custom_register_map_saved_and_used PASSED
tests/gui/test_desktop_app.py::test_close_with_demo_running_stops_simulators PASSED
tests/integration/test_database.py::test_database_initializes PASSED    
tests/integration/test_simulated_devices.py::test_modbus_decodes_registers PASSED
tests/integration/test_simulated_devices.py::test_modbus_signed_register PASSED
tests/integration/test_simulated_devices.py::test_modbus_exception_for_bad_address PASSED
tests/integration/test_simulated_devices.py::test_modbus_count_limit PASSED
tests/integration/test_simulated_devices.py::test_modbus_test_connection PASSED
tests/integration/test_simulated_devices.py::test_modbus_validate_config PASSED
tests/integration/test_simulated_devices.py::test_modbus_garbage_reply_raises_cleanly[] PASSED
tests/integration/test_simulated_devices.py::test_modbus_garbage_reply_raises_cleanly[\x00\x01] PASSED
tests/integration/test_simulated_devices.py::test_modbus_garbage_reply_raises_cleanly[\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff] PASSED
tests/integration/test_simulated_devices.py::test_modbus_garbage_reply_raises_cleanly[\x00\x01\x00\x01\x00\x03\x01\x03\x00] PASSED
tests/integration/test_simulated_devices.py::test_attendance_full_then_incremental PASSED
tests/integration/test_simulated_devices.py::test_attendance_rejects_malformed_rows PASSED
tests/integration/test_simulated_devices.py::test_attendance_connection_info PASSED
tests/integration/test_simulated_devices.py::test_attendance_bad_replies[not json\n] PASSED
tests/integration/test_simulated_devices.py::test_attendance_bad_replies[[1]\n] PASSED
tests/integration/test_simulated_devices.py::test_attendance_bad_replies[{"ok": false, "error": "denied"}\n] PASSED
tests/integration/test_simulated_devices.py::test_attendance_bad_replies[{"ok": true}\n] PASSED
tests/integration/test_simulated_devices.py::test_service_attendance_is_incremental_and_deduplicated PASSED
tests/integration/test_simulated_devices.py::test_service_cursor_is_per_device PASSED
tests/integration/test_simulated_devices.py::test_service_sensor_stores_time_series PASSED
tests/integration/test_simulated_devices.py::test_service_offline_device_is_audited_not_raised PASSED
tests/integration/test_simulated_devices.py::test_offline_poll_does_not_advance_cursor PASSED
tests/unit/test_discovery_scan.py::test_scan_finds_open_and_closed_ports PASSED
tests/unit/test_discovery_scan.py::test_scan_honours_cancel PASSED      
tests/unit/test_discovery_scan.py::test_scan_reports_progress PASSED    
tests/unit/test_discovery_scan.py::test_hostscanner_requires_confirmation PASSED
tests/unit/test_pipeline_services.py::test_validation_service_on_fixtures PASSED
tests/unit/test_pipeline_services.py::test_same_content_same_hash PASSED
tests/unit/test_pipeline_services.py::test_ingestion_quarantines_bad_file PASSED
tests/unit/test_pipeline_services.py::test_ingestion_missing_file_does_not_crash PASSED
tests/unit/test_pipeline_services.py::test_unsupported_suffix PASSED    
tests/unit/test_pipeline_services.py::test_receiver_lists_only_supported PASSED
tests/unit/test_pipeline_services.py::test_queue_persists_job PASSED    
tests/unit/test_pipeline_services.py::test_audit_truncates_and_persists PASSED
tests/unit/test_pipeline_services.py::test_connection_is_closed_after_with PASSED
tests/unit/test_pipeline_services.py::test_connection_rolls_back_on_error PASSED
tests/unit/test_pipeline_services.py::test_connector_validation_rejects[args0] PASSED
tests/unit/test_pipeline_services.py::test_connector_validation_rejects[args1] PASSED
tests/unit/test_pipeline_services.py::test_connector_validation_rejects[args2] PASSED
tests/unit/test_pipeline_services.py::test_connector_validation_rejects[args3] PASSED
tests/unit/test_pipeline_services.py::test_connector_validation_rejects[args4] PASSED
tests/unit/test_pipeline_services.py::test_connector_validation_rejects[args5] PASSED
tests/unit/test_pipeline_services.py::test_connector_validation_ok PASSED
tests/unit/test_pipeline_services.py::test_every_protocol_has_status PASSED
tests/unit/test_pipeline_services.py::test_external_delivery_disabled PASSED
tests/unit/test_pipeline_services.py::test_redaction_nested PASSED      
tests/unit/test_pipeline_services.py::test_allowlist PASSED             
tests/unit/test_pipeline_services.py::test_retry_backoff_capped PASSED  
tests/unit/test_pipeline_services.py::test_config_store_roundtrip_and_default PASSED
tests/unit/test_pipeline_services.py::test_tcp_health_check PASSED      
tests/unit/test_pipeline_services.py::test_fhir_rejects_non_https PASSED
tests/unit/test_pipeline_services.py::test_fhir_ok PASSED               
tests/unit/test_pipeline_services.py::test_fhir_failures_never_raise[[1,2]-None] PASSED
tests/unit/test_pipeline_services.py::test_fhir_failures_never_raise[not json-None] PASSED
tests/unit/test_pipeline_services.py::test_fhir_failures_never_raise[\xff\xfe-None] PASSED
tests/unit/test_pipeline_services.py::test_fhir_failures_never_raise[None-exc3] PASSED
tests/unit/test_pipeline_services.py::test_fhir_failures_never_raise[None-exc4] PASSED
tests/unit/test_pipeline_services.py::test_fhir_failures_never_raise[None-exc5] PASSED
tests/unit/test_readers.py::test_json PASSED                            
tests/unit/test_readers.py::test_csv PASSED                             
tests/unit/test_readers.py::test_xml PASSED                             
tests/unit/test_readers.py::test_xml_dtd_blocked PASSED                 
tests/unit/test_scope_validator.py::test_requires_confirmation PASSED   
tests/unit/test_scope_validator.py::test_rejects_large_range PASSED     
tests/unit/test_scope_validator.py::test_accepts_small_private_range PASSED
tests/unit/test_scope_validator.py::test_rejects_public_range PASSED    
tests/unit/test_security_hardening.py::test_xml_dtd_blocked_in_every_encoding[utf-8] PASSED
tests/unit/test_security_hardening.py::test_xml_dtd_blocked_in_every_encoding[utf-16] PASSED
tests/unit/test_security_hardening.py::test_xml_dtd_blocked_in_every_encoding[utf-16-le] PASSED
tests/unit/test_security_hardening.py::test_xml_lowercase_doctype_blocked PASSED
tests/unit/test_security_hardening.py::test_xml_children PASSED         
tests/unit/test_security_hardening.py::test_oversize_file_rejected PASSED
tests/unit/test_security_hardening.py::test_scope_rejects[0.0.0.0/29] PASSED
tests/unit/test_security_hardening.py::test_scope_rejects[224.0.0.0/30] PASSED
tests/unit/test_security_hardening.py::test_scope_rejects[::1/128] PASSED
tests/unit/test_security_hardening.py::test_scope_rejects[not-a-cidr] PASSED
tests/unit/test_security_hardening.py::test_scope_rejects[10.0.0.0/8] PASSED
tests/unit/test_security_hardening.py::test_scope_accepts[10.1.2.0/24] PASSED
tests/unit/test_security_hardening.py::test_scope_accepts[127.0.0.1/32] PASSED
tests/unit/test_security_hardening.py::test_scope_accepts[172.16.0.0/28] PASSED
tests/unit/test_security_hardening.py::test_scope_accepts[169.254.1.0/29] PASSED
============================= 106 passed in 9.75s ==============================
```
