from rest_framework import permissions

class IsManagingDirector(permissions.BasePermission):
    """
    Custom permission to allow only Managing Director to approve/reject issues
    """
    def has_permission(self, request, view):
        return (
            request.user 
            and request.user.is_authenticated 
            and request.user.role == "ManagingDirector"
        )
