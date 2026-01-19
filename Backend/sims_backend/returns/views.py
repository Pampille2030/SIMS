from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import F, DecimalField, ExpressionWrapper
from item_issuance.models import IssueRecord, IssueItem
from .models import ReturnedItem
from .serializers import ReturnItemSerializer
from employees.models import Employee


class ReturnedItemListCreateView(generics.ListCreateAPIView):
    """
    GET: List all returned items
    POST: Record one or multiple returned items
    """
    queryset = ReturnedItem.objects.all().select_related(
        "employee", "issue_item", "returned_by"
    )
    serializer_class = ReturnItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        return {"request": self.request}

    def create(self, request, *args, **kwargs):
        items_to_return = request.data.get("items_to_return", [])
        if not items_to_return:
            return Response({"detail": "No items provided"}, status=status.HTTP_400_BAD_REQUEST)

        returned_objects = []

        for item_data in items_to_return:
            serializer = ReturnItemSerializer(data=item_data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            returned_obj = serializer.save()
            returned_objects.append(returned_obj)

        serializer = ReturnItemSerializer(returned_objects, many=True, context={"request": request})
        return Response({"returned_items": serializer.data}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def get_issued_items_by_employee(request):
    """Get all issued TOOLS for a specific employee that can be returned"""
    try:
        employee_id = request.GET.get('employee_id')
        if not employee_id:
            return Response({'error': 'employee_id parameter is required'},
                            status=status.HTTP_400_BAD_REQUEST)

        employee = Employee.objects.get(id=employee_id)

        issued_items = IssueItem.objects.filter(
            issue_record__issued_to=employee,
            issue_record__status__in=['Issued', 'Partially_Returned'],
            item__category='tool'
        ).annotate(
            outstanding_quantity=ExpressionWrapper(
                F('quantity_issued') - F('returned_quantity'),
                output_field=DecimalField(max_digits=10, decimal_places=2)
            )
        ).filter(
            outstanding_quantity__gt=0
        ).select_related('issue_record', 'item', 'item__tool')

        items_data = []
        for item in issued_items:
            is_returnable = False
            tool_model = ''
            tool_serial = ''
            tool_returnable = False
            
            try:
                if hasattr(item.item, 'tool') and item.item.tool:
                    tool_returnable = item.item.tool.returnable
                    is_returnable = tool_returnable
                    tool_model = item.item.tool.model or ''
                    tool_serial = item.item.tool.serial_number or ''
            except Exception:
                tool_returnable = False
                is_returnable = False

            if tool_returnable:
                items_data.append({
                    'issue_item_id': item.id,
                    'issue_record_id': item.issue_record.id,
                    'issue_id': item.issue_record.issue_id,
                    'item_id': item.item.id,
                    'item_name': item.item.name,
                    'item_code': getattr(item.item, 'item_code', ''),
                    'category': item.item.category,
                    'quantity_issued': float(item.quantity_issued),
                    'returned_quantity': float(item.returned_quantity),
                    'outstanding_quantity': float(item.outstanding_quantity),
                    'unit': item.unit or getattr(item.item, 'unit', ''),
                    'issue_date': item.issue_record.issue_date,
                    'is_returnable': is_returnable,
                    'current_condition': item.return_condition or 'Good',
                    'tool_model': tool_model,
                    'tool_serial': tool_serial,
                    'tool_returnable': tool_returnable
                })

        return Response({
            'employee_id': employee.id,
            'employee_name': str(employee),
            'employee_code': getattr(employee, 'employee_code', ''),
            'department': employee.department if employee.department else '',
            'issued_items': items_data,
            'total_items': len(items_data),
            'message': 'Showing only returnable tools' if items_data else 'No returnable tools found'
        })

    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        print(f"Error in get_issued_items_by_employee: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': f'Internal server error: {str(e)}'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_employee_issued_items_list(request):
    """Get list of employees who have outstanding issued TOOLS"""
    try:
        employees_with_items = Employee.objects.filter(
            issues_received__items__item__category='tool',
            issues_received__items__returned_quantity__lt=F('issues_received__items__quantity_issued'),
            issues_received__status__in=['Issued', 'Partially_Returned']
        ).distinct()

        employees_data = []
        for employee in employees_with_items:
            outstanding_items = IssueItem.objects.filter(
                issue_record__issued_to=employee,
                issue_record__status__in=['Issued', 'Partially_Returned'],
                item__category='tool',
                returned_quantity__lt=F('quantity_issued')
            ).select_related('item__tool')
            
            returnable_outstanding_count = 0
            for item in outstanding_items:
                try:
                    if hasattr(item.item, 'tool') and item.item.tool and item.item.tool.returnable:
                        returnable_outstanding_count += 1
                except Exception:
                    continue

            if returnable_outstanding_count > 0:
                employees_data.append({
                    'employee_id': employee.id,
                    'employee_name': str(employee),
                    'employee_code': getattr(employee, 'employee_code', ''),
                    'department': employee.department if employee.department else '',
                    'outstanding_items_count': returnable_outstanding_count,
                    'item_type': 'Tools only'
                })

        return Response({
            'employees': employees_data,
            'total_employees': len(employees_data),
            'message': 'Showing employees with outstanding returnable tools'
        })

    except Exception as e:
        import traceback
        print(f"Error in get_employee_issued_items_list: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_all_returnable_tools(request):
    """Get all returnable tools across all employees"""
    try:
        outstanding_tools = IssueItem.objects.filter(
            item__category='tool',
            issue_record__status__in=['Issued', 'Partially_Returned'],
            returned_quantity__lt=F('quantity_issued')
        ).select_related('issue_record', 'issue_record__issued_to', 'item', 'item__tool')
        
        tools_data = []
        for item in outstanding_tools:
            is_returnable = False
            try:
                if hasattr(item.item, 'tool') and item.item.tool:
                    is_returnable = item.item.tool.returnable
            except Exception:
                is_returnable = False
            
            if is_returnable:
                outstanding = float(item.quantity_issued - item.returned_quantity)
                tools_data.append({
                    'issue_item_id': item.id,
                    'issue_record_id': item.issue_record.id,
                    'issue_id': item.issue_record.issue_id,
                    'item_id': item.item.id,
                    'item_name': item.item.name,
                    'employee_id': item.issue_record.issued_to.id,
                    'employee_name': str(item.issue_record.issued_to),
                    'employee_code': getattr(item.issue_record.issued_to, 'employee_code', ''),
                    'department': item.issue_record.issued_to.department if item.issue_record.issued_to.department else '',
                    'quantity_issued': float(item.quantity_issued),
                    'returned_quantity': float(item.returned_quantity),
                    'outstanding_quantity': outstanding,
                    'unit': item.unit or getattr(item.item, 'unit', ''),
                    'issue_date': item.issue_record.issue_date,
                    'is_returnable': is_returnable
                })
        
        return Response({
            'tools': tools_data,
            'total_tools': len(tools_data),
            'message': 'Showing all returnable tools across all employees'
        })
        
    except Exception as e:
        import traceback
        print(f"Error in get_all_returnable_tools: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_issued_materials(request):
    """Get issued materials (non-returnable) for verification"""
    try:
        employee_id = request.GET.get('employee_id')
        
        if employee_id:
            employee = Employee.objects.get(id=employee_id)
            materials = IssueItem.objects.filter(
                issue_record__issued_to=employee,
                issue_record__status__in=['Issued', 'Partially_Returned'],
                item__category='material'
            ).select_related('issue_record', 'item')
        else:
            materials = IssueItem.objects.filter(
                item__category='material',
                issue_record__status__in=['Issued', 'Partially_Returned']
            ).select_related('issue_record', 'issue_record__issued_to', 'item')
        
        materials_data = []
        for item in materials:
            outstanding = float(item.quantity_issued - item.returned_quantity)
            if outstanding > 0:
                materials_data.append({
                    'issue_item_id': item.id,
                    'item_name': item.item.name,
                    'employee_name': str(item.issue_record.issued_to),
                    'quantity_issued': float(item.quantity_issued),
                    'returned_quantity': float(item.returned_quantity),
                    'outstanding_quantity': outstanding,
                    'unit': item.unit or getattr(item.item, 'unit', ''),
                    'issue_date': item.issue_record.issue_date,
                    'category': 'material',
                    'is_returnable': False,
                    'note': 'Materials are consumable and not returnable'
                })
        
        return Response({
            'materials': materials_data,
            'total_materials': len(materials_data),
            'message': 'Materials shown for reference only - they are not returnable'
        })
        
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        print(f"Error in get_issued_materials: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
