import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()

# Check all domain_monitoring tables
tables = [
    'domain_monitoring_companydomain',
    'domain_monitoring_monitoreddomain',
    'domain_monitoring_monitoreddomainalert',
    'domain_monitoring_lookalikedomain',
    'domain_monitoring_newlyregistereddomain',
]

for table in tables:
    print(f"\n{'='*60}")
    print(f"TABLE: {table}")
    print('='*60)
    
    # Get constraints
    cursor.execute("""
        SELECT kcu.column_name, tc.constraint_name, tc.constraint_type
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = %s
        ORDER BY tc.constraint_type, tc.constraint_name, kcu.ordinal_position;
    """, [table])
    
    constraints = {}
    for row in cursor.fetchall():
        col, name, ctype = row
        if name not in constraints:
            constraints[name] = {'type': ctype, 'columns': []}
        if col:
            constraints[name]['columns'].append(col)
    
    for name, info in constraints.items():
        cols = ', '.join(info['columns']) if info['columns'] else 'N/A'
        print(f"  {info['type']:15} {name:50} ({cols})")

print("\n" + "="*60)
print("Checking intelligence_harvester and reverse_whois_monitoring")
print("="*60)

for table in ['intelligence_harvester_source', 'reverse_whois_monitoring_monitoringterm']:
    print(f"\nTABLE: {table}")
    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = %s
        ORDER BY ordinal_position;
    """, [table])
    
    for row in cursor.fetchall():
        print(f"  {row[0]:30} {row[1]}")
