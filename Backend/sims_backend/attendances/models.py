from django.db import models
from django.utils import timezone
from employees.models import Employee


class Attendance(models.Model):
    ATTENDANCE_CHOICES = [
        ('O', 'Present'),
        ('X', 'Absent'),
        ('L', 'Leave'),
        ('S', 'Sick'),
    ]

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='attendances'
    )
    date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=1, choices=ATTENDANCE_CHOICES)
    
    class Meta:
        unique_together = ('employee', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.employee.full_name} - {self.date}"
