app_name = "Nerum"
version = "0.1"

def run_workflow(workflow_name, steps):
    print(f"\n[Nerum] Running: {workflow_name}")
    for step in steps:
        print(f"  -> {step}")
    print(f"  Completed!")

print(f"{app_name} v{version} started!")

run_workflow("Send Welcome Email", [
    "Trigger: New user signed up",
    "Action: Send email",
    "Action: Log to database"
])

run_workflow("WhatsApp Alert", [
    "Trigger: Payment received",
    "Action: Send WhatsApp message",
])