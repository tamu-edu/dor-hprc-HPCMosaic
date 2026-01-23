"""
Request Handler Module
Centralized logic for submitting requests to HPRC Bot with email fallback
"""
import logging
import json
import re
import datetime
import requests
import smtplib
from email.mime.text import MIMEText
import traceback

# Module-level logger
logger = logging.getLogger(__name__)
audit_logger = logging.getLogger('audit')

# ============================================================================
# CONFIGURATION
# ============================================================================
_config = {}

def configure(cluster_name, hprcbot_route, request_email, help_email, get_user_email_func, get_group_directory_info_func):
    """
    Configure the request handler with app settings

    Args:
        cluster_name: Name of the cluster
        hprcbot_route: URL for HPRC Bot
        request_email: Email address for fallback
        help_email: Help desk email
        get_user_email_func: Function to get user email
        get_group_directory_info_func: Function to get group directory info
    """
    _config['cluster_name'] = cluster_name
    _config['hprcbot_route'] = hprcbot_route
    _config['request_email'] = request_email
    _config['help_email'] = help_email
    _config['get_user_email'] = get_user_email_func
    _config['get_group_directory_info'] = get_group_directory_info_func

def clean_number(value):
    """
    Strips non-numeric characters (like 'TB', 'GB', etc.) and converts to float.
    Returns None if input is None or invalid.
    """
    if value:
        try:
            return float(re.sub(r"[^\d.]+", "", value))
        except ValueError:
            return None
    return None

def log_request_audit(request_type, user, status, error=None):
    """Log request to audit trail for compliance and debugging"""
    audit_entry = {
        'timestamp': datetime.datetime.now().isoformat(),
        'request_type': request_type,
        'user': user,
        'status': status,
        'cluster': _config.get('cluster_name', 'unknown')
    }

    if error:
        audit_entry['error'] = str(error)

    audit_logger.info(json.dumps(audit_entry))

# ============================================================================
# REQUEST BUILDERS - Convert form data to bot params and email data
# ============================================================================

def build_bot_params(request_type, form_data, user):
    """Build bot parameters based on request type"""
    get_user_email = _config['get_user_email']
    get_group_directory_info = _config['get_group_directory_info']
    cluster_name = _config['cluster_name']
    email = get_user_email(user)

    if request_type == 'Quota':
        # Format numbers for bot

        try:
            formatted_current_quota = clean_number(form_data['current_quota'])
            formatted_current_file_limit = int(re.sub(r"[^\d]", "", form_data['current_file_limit'])) if form_data['current_file_limit'] else None
            formatted_new_quota = clean_number(form_data['new_quota'])
            formatted_new_file_limit = int(re.sub(r"[^\d]", "", form_data['new_file_limit'])) if form_data['new_file_limit'] else None
            has_previous = form_data['request_type_detail'] == 'Extension'

        except ValueError as ve:
            logger.warning(f"Failed to convert quota fields: {ve}")
            formatted_current_quota = form_data['current_quota']
            formatted_current_file_limit = form_data['current_file_limit']
            formatted_new_quota = form_data['new_quota']
            formatted_new_file_limit = form_data['new_file_limit']
            has_previous = form_data['request_type_detail'] == 'Extension'

        buyin_status = 'yes' if form_data.get('is_buy_request') == 'Yes' else 'no'

        # Build justification
        combined_justification = f"""
Is the PI aware of this request?
{form_data.get('pi_awareness', '')}

What data is stored with the requested quota?
{form_data.get('stored_data', '')}

Briefly describe the research project that will be supported by the requested storage?
{form_data.get('research_description', '')}

What is the input/output size of the job?
{form_data.get('job_size', '')}

What is your long-term storage plan for your data after the quota increase expires?
{form_data.get('storage_plan', '')}
"""

        return {
            'request_type': 'Quota',
            'user': user,
            'directory': form_data['directory'],
            'current_quota': formatted_current_quota,
            'current_file_limit': formatted_current_file_limit,
            'desired_disk': formatted_new_quota,
            'total_file_limit': formatted_new_file_limit,
            'request_justification': combined_justification,
            'comment': form_data.get('comment', ''),
            'cluster_name': cluster_name,
            'confirmBuyin': buyin_status,
            'has_previous': has_previous,
            'request_until': form_data.get('expiration_date', ''),
            'account_number': form_data.get('account_number', '') if buyin_status == 'yes' else '',
            'email': email
        }

    elif request_type == 'Software':
        return {
            "request_type": "Software",
            "user": user,
            "email": email,
            "cluster_name": cluster_name,
            "software_name": form_data['software_name'],
            "software_version": form_data['software_version'],
            "software_link": form_data['software_link'],
            "toolchains": form_data['software_toolchain'],
            "request_justification": f"Category: {form_data['software_category']}\n{form_data['software_info']}",
            "additional_notes": ""
        }

    elif request_type == 'Group':
        params = {
            'request_type': 'Group',
            'user': user,
            'email': email,
            'cluster_name': cluster_name,
            'comments': form_data.get('comments', ''),
            'new_group': form_data['group_request_type'] == 'cgroup'
        }

        # Add group info
        if form_data.get('group_name'):
            dir_info = get_group_directory_info(form_data['group_name'])
            params['group_name'] = form_data['group_name']
            params['directory'] = dir_info['directory']

        # Set action based on request type
        if form_data['group_request_type'] == 'cgroup':
            params['action'] = 'createGroup'
            params['Add'] = 'createGroup'
            params['target_users'] = form_data.get('target_users', [])

        elif form_data['group_request_type'] == 'madd':
            params['action'] = 'addMembers'
            params['Add'] = 'addMembers'
            params['target_users'] = form_data.get('target_users', [])

        elif form_data['group_request_type'] == 'mremove':
            params['action'] = 'deleteMembers'
            params['Add'] = 'deleteMembers'
            params['target_users'] = form_data.get('target_users', [])

        elif form_data['group_request_type'] == 'rgroup':
            params['action'] = 'requestAccess'
            params['Add'] = 'requestAccess'

        return params

    elif request_type == 'Help':
        params = {
            "request_type": "Help",
            "user": user,
            "email": email,
            "cluster_name": cluster_name,
            "help_category": form_data.get('help_request_type', form_data.get('direct_help_topic', ''))
        }
    
        # Add type-specific fields
        if 'issue_description' in form_data:
            params['issue_description'] = form_data['issue_description']
        if 'program_file_path' in form_data:
            params['program_file_path'] = form_data['program_file_path']
        if 'additional_information' in form_data:
            params['additional_information'] = form_data['additional_information']
        if 'job_id' in form_data:
            params['job_id'] = form_data['job_id']
        if 'job_file_path' in form_data:
            params['job_file_path'] = form_data['job_file_path']
        if 'error_message' in form_data:
            params['error_message'] = form_data['error_message']

        return params

    elif request_type == 'Purchase':
        return {
            "request_type": "Purchase",
            "user": user,
            "email": email,
            "cluster_name": cluster_name,
            "what": form_data.get('what', ''),
            "who": form_data.get('who', ''),
            "due": form_data.get('due', ''),
            "accounts": form_data.get('accounts', []),
            "additional_notes": form_data.get('additional_notes', '')
        }

    elif request_type == 'Acknowledgement':
        return {
            "request_type": "Acknowledgement",
            "user": user,
            "email": email,
            "cluster_name": cluster_name,
            "doi": form_data.get('doi', ''),
            "additional_info": form_data.get('additional_info', '')
            "timestamp": form_data.get('timestamp', '')
        }
    else:
        raise ValueError(f"Unknown request type: {request_type}")

def build_email_data(request_type, form_data, user):
    """Build email subject and body based on request type"""
    cluster_name = _config['cluster_name']
    subject = f"[{cluster_name}] {request_type} Request: {user}"

    if request_type == 'Quota':
        is_buyin = form_data.get('is_buy_request') == 'Yes'

        if is_buyin:
            body = f"""
Cluster: {cluster_name}
User: {user}
DiskName: {form_data.get('directory')}
Request Type: Buy-in Quota Request
Expiration Date: {form_data.get('expiration_date', '')}
Account Number: {form_data.get('account_number', '')}

--- CURRENT QUOTA ---
Current disk space: {form_data.get('current_quota')}
Current file limit: {form_data.get('current_file_limit')}

--- REQUESTING QUOTA ---
Requesting disk space: {form_data.get('new_quota')}TB
Requesting file limit: {form_data.get('new_file_limit')}
Comment: {form_data.get('comment', '')}
"""
        else:
            body = f"""
Cluster: {cluster_name}
User: {user}
DiskName: {form_data.get('directory')}
Request Type: {form_data.get('request_type_detail')}
--- CURRENT QUOTA ---
Current disk space: {form_data.get('current_quota')}
Current file limit: {form_data.get('current_file_limit')}
--- REQUESTING QUOTA ---
Requesting disk space: {form_data.get('new_quota')}TB
Requesting file limit: {form_data.get('new_file_limit')}
--- Justification ---
Is the PI aware of this request?
{form_data.get('pi_awareness', '')}
What data is stored with the requested quota?
{form_data.get('stored_data', '')}
Briefly describe the research project that will be supported by the requested storage?
{form_data.get('research_description', '')}
What is the input/output size of the job?
{form_data.get('job_size', '')}
What is your long-term storage plan for your data after the quota increase expires?
{form_data.get('storage_plan', '')}
Comment: {form_data.get('comment', '')}
"""
    elif request_type == 'Software':
        body = f"""
Cluster: {cluster_name}
User: {user}
Request Type: Software Installation
Software Name: {form_data.get('software_name', '')}
Version: {form_data.get('software_version', '')}
Download Link: {form_data.get('software_link', '')}
Toolchain: {form_data.get('software_toolchain', '')}
Category: {form_data.get('software_category', '')}
Additional Information:
{form_data.get('software_info', '')}
"""

    elif request_type == 'Help':
        body = f"""
Cluster: {cluster_name}
User: {user}
Request Type: Help Request
Topic: {form_data.get('help_request_type', form_data.get('direct_help_topic', 'General'))}
Issue Description: {form_data.get('issue_description', '')}
"""

    elif request_type == 'Group':
        body = f"""
Cluster: {cluster_name}
User: {user}
Request Type: Group Management
Action: {form_data.get('action', '')}
Group Name: {form_data.get('group_name', '')}
Members: {', '.join(form_data.get('target_users', []))}
Comments: {form_data.get('comments', '')}
"""

    elif request_type == 'Purchase':
        body = f"""
Cluster: {cluster_name}
User: {user}
Request Type: Account Purchase
What: {form_data.get('what', '')}
Who: {form_data.get('who', '')}
Due Date: {form_data.get('due', '')}
Accounts: {', '.join(form_data.get('accounts', []))}
Notes: {form_data.get('additional_notes', '')}
"""

    elif request_type == 'Acknowledgement':
        body = f"""
Cluster: {cluster_name}
User: {user}
Request Type: Publication Acknowledgement
DOI: {form_data.get('doi', '')}
Additional Info: {form_data.get('additional_info', '')}
Timestamp: {form_data.get('timestamp', '')}
"""

    else:
        body = f"""
Cluster: {cluster_name}
User: {user}
Request Type: {request_type}
Data: {json.dumps(form_data, indent=2)}
"""
    return {
        'subject': subject,
        'body': body
    }

# ============================================================================
# SUBMISSION LOGIC
# ============================================================================

def send_to_bot(params, timeout=15):
    """Send request to HPRC Bot"""
    hprcbot_route = _config['hprcbot_route']

    try:
        logger.info(f"Sending {params.get('request_type')} request to HPRC Bot")
        logger.debug(f"Bot params: {json.dumps(params, indent=2)}")

        response = requests.post(
            f"{hprcbot_route}/HPRCapp/OOD",
            json=params,
            timeout=timeout
        )

        if response.status_code == 200 or response.text == "OK":
            logger.info(f"Bot accepted {params.get('request_type')} request")
            return True, None

        else:
            error_msg = f"Bot returned {response.status_code}: {response.text}"
            logger.warning(error_msg)
            return False, error_msg

    except requests.exceptions.Timeout:
        error_msg = f"Bot request timed out after {timeout}s"
        logger.error(error_msg)
        return False, error_msg

    except Exception as e:
        error_msg = f"Bot request failed: {str(e)}"
        logger.error(error_msg)
        logger.debug(traceback.format_exc())
        return False, error_msg

def send_email_fallback(subject, body, user):
    """Send email as fallback when bot fails"""
    get_user_email = _config['get_user_email']
    request_email = _config['request_email']

    try:
        logger.info("Attempting email fallback")

        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = get_user_email(user)
        msg['To'] = request_email
        smtp_server = "smtp.tamu.edu"
        smtp_port = 25

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            response = server.send_message(msg)

            if not response:
                logger.info("Email sent successfully")
                return True, None

            else:
                error_msg = f"Email partial failure: {str(response)}"
                logger.warning(error_msg)
                return True, error_msg

    except Exception as e:
        error_msg = f"Email failed: {str(e)}"
        logger.error(error_msg)
        logger.debug(traceback.format_exc())
        return False, error_msg

def handle_request_submission(request_type, form_data, user):
    """
    Centralized request handler for all request types

    Args:
        request_type: Type of request (Quota, Software, Help, etc.)
        form_data: Dictionary of extracted form fields
        user: Username string

    Returns:
        dict: Response dictionary with 'message', 'status', and optional 'error'
        int: HTTP status code
    """

    help_email = _config['help_email']
    logger.info(f"Processing {request_type} request from {user}")

    try:
        # Build bot params and email data
        bot_params = build_bot_params(request_type, form_data, user)
        email_data = build_email_data(request_type, form_data, user)

        # Try bot first
        bot_success, bot_error = send_to_bot(bot_params)

        if bot_success:
            log_request_audit(request_type, user, 'bot_success')

            return {
                "message": f"Your {request_type.lower()} request has been submitted successfully via HPRC Bot.",
                "status": "bot_success"
            }, 200

        # Bot failed, try email fallback
        logger.warning(f"Bot submission failed for {request_type}, attempting email fallback")
        log_request_audit(request_type, user, 'bot_failed', bot_error)

        email_success, email_error = send_email_fallback(
            email_data['subject'],
            email_data['body'],
            user
        )

        if email_success:
            if email_error:
                log_request_audit(request_type, user, 'email_partial', email_error)

                return {
                    "message": f"Your {request_type.lower()} request was submitted via email, but some issues occurred.",
                    "status": "email_partial",
                    "details": email_error
                }, 200

            else:
                log_request_audit(request_type, user, 'email_success')

                return {
                    "message": f"Your {request_type.lower()} request has been submitted successfully via email.",
                    "status": "email_success"
                }, 200

        else:
            log_request_audit(request_type, user, 'email_failed', email_error)

            return {
                "message": f"Your {request_type.lower()} request was logged, but we couldn't email support. Please contact {help_email}.",
                "status": "email_failed",
                "error": email_error
            }, 202

    except Exception as e:
        error_msg = f"Failed to build request: {str(e)}"
        logger.error(error_msg)
        logger.debug(traceback.format_exc())
        log_request_audit(request_type, user, 'failed', error_msg)

        return {
            "error": f"Failed to process {request_type.lower()} request: {str(e)}. Please contact {help_email}.",
            "status": "failed"
        }, 500
