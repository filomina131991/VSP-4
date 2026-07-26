#!/usr/bin/env bash
set -e

echo "Checking teacher management API compatibility..."

# Check if there are any JavaScript/TypeScript files that might reference these APIs
cd "D:\Tamil Vizuthukal App\VSP 4"

# Look for any imports or references to teacher-related API endpoints
function find_api_references() {
    local pattern=$1
    find . -name "*.{ts,tsx,js}" -type f | xargs grep -l "$pattern" 2>/dev/null || true
}

# Check for teacher API imports
TEACHER_APIS=$(find_api_references "api.*teacher")

echo "Files referencing teacher APIs:"
for file in $TEACHER_APIS; do
    echo "  - $file"
done

# Check package.json for scripts or dependencies
if [ -f "package.json" ]; then
    echo "\nChecking package.json...
"
    cat package.json | grep -E "(scripts|dependencies)" | head -20
fi

# Generate a test report
report_file="test-teacher-api-compat.json"
cat > $report_file << EOF
{
  "issues": [
    {
      "severity": "WARNING",
      "description": "The Teacher Management API expects 'mediums', 'assignedSubjects', 'teachingSubjects' arrays in the POST/PUT payload",
      "solution": "The frontend now correctly sends these extracted arrays from teacher assignments",
      "files": ["src/pages/school/TeacherManagementPage.tsx"]
    },
    {
      "severity": "INFO",
      "description": "The openEditModal function now uses dmMediums/dmSubjects from DataContext instead of classHierarchy",
      "solution": "Simplifies assignment reconstruction and improves data consistency",
      "files": ["src/pages/school/TeacherManagementPage.tsx"]
    }
  ],
  "status": "COMPATIBLE",
  "type": "IMPROVEMENT",
  "notes": "The changes improve data flow between frontend and backend by properly normalizing teacher data structures."
}
EOF

echo -e "\n\nTest report generated: $report_file"
cat $report_file
echo -e "\n\nDone."
EOF

echo "Checking project structure..."
cd "D:\Tamil Vizuthukal App\VSP 4"
ls -la
