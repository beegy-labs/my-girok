model
  schema 1.1

# ================================================
# EXISTING TYPES (Phase 3)
# ================================================

type platform
  relations
    define super_admin: [user, admin]
    define admin: [user, admin]

type team
  relations
    define owner: [user, admin]
    define member: [user, admin]

type service
  relations
    define owner: [user, admin]
    define admin: [user, admin, team#member, department#head]
    define operator: [user, admin, team#member, department#member]
    define viewer: [user, admin, team#member, department#member]
    define can_manage: owner or admin
    define can_operate: can_manage or operator
    define can_view: can_operate or viewer
    define can_view_recordings: can_view
    define can_view_audit: can_operate

type session_recording
  relations
    define parent_service: [service]
    define viewer: [user, admin, team#member]
    define exporter: [user, admin, team#member]
    define can_view: viewer or parent_service->can_view_recordings
    define can_export: exporter or parent_service->can_manage

type user_management
  relations
    define parent_service: [service]
    define reader: [user, admin, team#member]
    define editor: [user, admin, team#member]
    define can_read: reader or parent_service->can_operate
    define can_edit: editor or parent_service->can_manage

type audit_log
  relations
    define parent_service: [service]
    define viewer: [user, admin, team#member]
    define can_view: viewer or parent_service->can_view_audit

# ================================================
# NEW TYPES (Phase 4)
# ================================================

type department
  relations
    define head: [admin]
    define manager: [admin]
    define member: [admin, department#member]
    define can_manage_members: head or manager
    define can_view_members: can_manage_members or member
    define can_approve_requests: head or manager

type menu_item
  relations
    define allowed_admin: [admin]
    define allowed_role: [role#assigned]
    define allowed_team: [team#member]
    define allowed_department: [department#member]
    define can_view: allowed_admin or allowed_role or allowed_team or allowed_department

type role
  relations
    define assigned: [admin]
    define parent_role: [role]
    define can_assign: [admin] or parent_role->can_assign

type resource_permission
  relations
    define resource: [service, session_recording, user_management, audit_log]
    define granted: [admin, team#member, department#member]
    define denied: [admin]
    define can_access: granted but not denied

type country
  relations
    define admin: [admin, team#member]
    define operator: [admin, team#member]
    define can_manage: admin
    define can_operate: can_manage or operator
