"""
Prompts for manufacturing data digest
"""

from typing import Optional
import pandas as pd
import re
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent  # folder where this .py lives



def get_manufacturing_digest_prompt(messages: str, component_details: str) -> str:
    """
    Build the complete prompt for manufacturing digest analysis
    
    Args:
        messages: Slack messages text to analyze
        component_details: Component hierarchy and details (CSV or list format)
        
    Returns:
        Complete formatted prompt ready to send to the model
    """
    prompt = f'''You are an AI assistant for a manufacturing dashboard that shows the latest 
                updates on components the company handles. You are given Slack messages 
                between the engineering team and a list of components they manage. 

                Your task: Identify which components are being discussed and create a summary 
                of issues, changes, or updates for each component.

                Instructions: 
                1. Only consider messages which are talking about issues, changes, updates to the components ignore casual conversations 
                    and everything else. 
                2. Components follow a hierarchical structure: Item 1 → Item 1.1 → Item 1.1.1
                (parent → child → grandchild)
                3. Group summaries by the most specific component mentioned. If both a parent 
                component (e.g., "Gantry 9.3") and child component (e.g., "Wooden Screw 9.3.4") 
                are discussed, create the summary for the child component only. 
                4. If you mind multiple components with the same name and same parent name, 
                choose the one you are most confident about
                5. When a component is mentioned without its ID, use the component details 
                list to identify the correct component based on name matching and context.
                6. Output format for each component. Important: Do not write anything else in the output:
                    Component ID: [ID]
                    Summary: [Brief overview of all discussion points about this component]
                    Latest Update: [Most recent action or status mentioned]


                Example Message Input:
                User A: Hey the stress testing for the wooden screw failed
                User B: Try increasing the density
                User C: Didnt we have the same problem with the metal screw while testing for the rotator?
                User A: We might also have to test the belt for the gantry.
                User A: I am going out for lunch
                User D: Yeah the test is going on
                User D: I will come meet you in the cafeteria

                Example Component details:
                9.3 - Gantry
                9.3.4 - Wooden Screw M10
                8.7 - Rotator
                8.7.1 - Metal Screw S15
                10  - Gantry
                10.7 - Belt

                Component ID: 9.3.4
                Summary: The stress test for the Wooden Screw M10 failed. Planning on increasing the density of the Wooden Screw M10.
                Latest update: Planning to increase screw density.

                Component ID: 10.7
                Summary: They are planning the stress test for belt in the Gantry
                Last update: Test ongoing, awaiting results.

                Component ID: 8.7.1
                Summary: Problems with Metal Screw S15 in Rotator while testing
                Last Update: No data yet

                Here is the text and the components details below:
                <text messages>{messages}
                <component details>{component_details}      
                '''
    
    return prompt



def get_supplier_digest_prompt(messages: str, component_details: str, supplier_details: str) -> str:
    """
    Build the complete prompt for manufacturing digest analysis
    
    Args:
        messages: Slack messages text to analyze
        component_details: Component hierarchy and details (CSV or list format)
        
    Returns:
        Complete formatted prompt ready to send to the model
    """
    prompt = f'''You are an AI assistant for a manufacturing and supplychain dashboard that shows the latest 
                updates on components the company handles. You are given Slack messages 
                between the engineering/supply chain team, the list of suppliers and a list of components they manage. 

                Your task: Identify which suppliers and components are being discussed and create a summary 
                of issues, changes, or updates for each component.

                Instructions: 
                1. Only consider messages which are talking about issues, changes, updates to the supply chain or component ignore casual conversations 
                    and everything else. 
                2. Components follow a hierarchical structure: Item 1 → Item 1.1 → Item 1.1.1
                (parent → child → grandchild)
                3. Group summaries by the most specific component mentioned. If both a parent 
                component (e.g., "Gantry 9.3") and child component (e.g., "Wooden Screw 9.3.4") 
                are discussed, create the summary for the child component only. 
                4. If you are confused between multiple components with the same name and same parent name, 
                choose the one you are most confident about
                5. When a component is mentioned without its ID, use the component details 
                list to identify the correct component based on name matching and context.
                6. You can view the supplier details to identify the correct supplier based on name matching and context
                6. Output format for each component. Important: Do not write anything else in the output:
                    Component ID: [ID]
                    Supplier ID: [ID]
                    Summary: [Brief overview of all discussion points about this component]
                    Latest Update: [Most recent action or status mentioned]


                Example Message Input:
                User A: Hey we might not receive the M10 screws from BondBrook
                User B: Why? Whats the problem?
                User C: Didnt we have the same problem with the metal screws with them?
                User A: We might also have to check for the belt for the gantry.
                User A: I am going out for lunch
                User D: I am checking with CircuitHarbor if they can deliver?
                User D: I will come meet you in the cafeteria

                Example Component details:
                9.3 - Gantry
                9.3.4 - Wooden Screw M10
                8.7 - Rotator
                8.7.1 - Metal Screw S15
                10  - Gantry
                10.7 - Belt

                Example Supplier details:
                e7dc5cc7-cb72-4b70-9554-ac94b1aff9c8 - BondBrook Adhesives
                5f5fb9cc-59c5-4179-8bc2-8a69303a989f - CircuitHarbor Distribution
                db428870-5338-40a7-b64f-a6b9939c88f9 - Evergreen Industrial Supply

                Component ID: 9.3.4
                Supplier ID: e7dc5cc7-cb72-4b70-9554-ac94b1aff9c8
                Summary: Delivery issues with BondBrook Adhesives for the screws. Had past problems with Metal screws as well with them.
                Latest update: Checking with CircuitHarbor for delivery

                Component ID: 10.7
                Supplier ID: e7dc5cc7-cb72-4b70-9554-ac94b1aff9c8
                Summary: Might need to check supply of Belt for Gantry
                Last update: No data yet

                Here is the text and the components details below:
                <text messages>{messages}
                <component details>{component_details}
                <supplier details>{supplier_details}      
                '''
    
    return prompt


def get_ecr_editing_prompt(discussion_summaries: str, latest_updates: str, component_id: str, 
                           additional_details: str, product: str, version: str, component_name: str, internal_part_name: str,
                            quantity: str, material: str, category: str, mass: str, length: str, 
                            tessellation_quality: str, finish: str, notes: str, ):
    
    template_path = BASE_DIR / "ECR_JSON_TEMPLATE" / "ecr_template.json"
    field_defs_path = BASE_DIR / "ECR_JSON_TEMPLATE" / "ecr_field_definitions.json"

    with open(template_path, 'r') as f:
        ECR_TEMPLATE = json.load(f)

    with open(field_defs_path, 'r') as f:  
        FIELD_DEFINITIONS = json.load(f)
    
    system_prompt = """You are an expert Engineering Change Request (ECR) assistant for warehouse robotics.
                        Your task is to extract relevant information from discussion summaries and additional details, 
                        then populate an ECR form in JSON format.

                        CRITICAL RULES:
                        1. Return ONLY valid JSON matching the template structure
                        2. Use exact values from allowed_values lists when applicable
                        3. Use "NA" or empty string "" for fields where information is not available
                        4. Use empty arrays [] for multi-select fields when no data is available
                        5. For boolean fields, use true/false (not strings)
                        6. For cost fields, use numeric strings without dollar signs or commas (e.g., "50000" not "$50,000")
                        7. Leave approval_workflow section empty (filled during approval process)
                        8. Be thorough - extract all relevant information from the provided text

                        Do NOT include markdown formatting, explanations, or any text outside the JSON object."""

    user_prompt = f"""ECR FORM TEMPLATE TO FILL:
                    {json.dumps(ECR_TEMPLATE, indent=2)}

                    FIELD DESCRIPTIONS AND CONSTRAINTS:
                    {json.dumps(FIELD_DEFINITIONS['field_descriptions'], indent=2)}

                    ALLOWED VALUES FOR SPECIFIC FIELDS:
                    {json.dumps(FIELD_DEFINITIONS['allowed_values'], indent=2)}

                    COMPONENT DETAILS FOR WHICH ECR IS BEING WRITTEN:
                    Product name: {product}
                    Product Version: {version}
                    Component ID: {component_id}
                    Component Name: {component_name}
                    Internal Part Name: {internal_part_name}
                    Quantity: {quantity}
                    Material: {material}
                    Category: {category}
                    Mass: {mass}
                    Length: {length}
                    Tessellation Quality: {tessellation_quality}
                    Finish: {finish}
                    Notes: {notes}

                    DISCUSSION SUMMARIES FOR THE COMPONENT:
                    Summary of discussion between engineers: {discussion_summaries}
                    Last update from the engineers: {latest_updates}

                    ADDITIONAL DETAILS PROVIDED BY USER:
                    {additional_details}

                    Based on the above information, fill out the ECR form JSON. Extract as much information as possible from the discussion summaries and additional details. Return ONLY the filled JSON object."""

    return system_prompt, user_prompt


    

def parse_llm_output(text):
    # Split by double newlines to separate entries
    entries = text.strip().split('\n\n')
    
    data = []
    for entry in entries:

        component_match = re.search(r'Component ID:\s*(.+?)(?:\n|$)', entry)
        supplier_match = re.search(r'Supplier ID:\s*(.+?)(?:\n|$)', entry)
        summary_match = re.search(r'Summary:\s*(.+?)(?=\nLatest Update:|\n\n|$)', entry, re.DOTALL)
        update_match = re.search(r'Latest Update:\s*(.+?)(?:\n\n|$)', entry, re.DOTALL)
        
        if (component_match and summary_match and update_match) or (supplier_match and summary_match and update_match):
            data.append({
                'item_id': component_match.group(1).strip() if component_match else None,
                'supplier_id': supplier_match.group(1).strip() if supplier_match else None,
                'summary': summary_match.group(1).strip(),
                'latest_update': update_match.group(1).strip()
            })
        
    return data


# Example usage and testing
if __name__ == "__main__":
    # Test data
    test_messages = """
User A: The motor on unit 5.2.1 is overheating
User B: Let me check the cooling system
User C: What's for lunch?
"""
    
    test_components = """
5.2 - Motor Assembly
5.2.1 - Primary Motor
5.2.2 - Secondary Motor
"""
    
    # Generate prompt
    prompt = get_manufacturing_digest_prompt(test_messages, test_components)
    
    print("Generated Prompt:")
    print("=" * 80)
    print(prompt)
    print("=" * 80)