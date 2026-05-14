"""
HPRC Bot request submission routes.

All routes here follow the same pattern:
  1. Extract form data
  2. Build a params dict
  3. POST to the HPRC Bot endpoint
  4. Fall back to SMTP email if the bot call fails (quota only)
"""

import os
import re
import logging
import smtplib
from datetime import datetime
from email.mime.text import MIMEText

import requests as http_requests
from flask import request, jsonify

from . import api
from .config import cluster_name, request_email, help_email, hprcbot_route
from .utils import get_user_email, clean_number, get_group_directory_info

def _post_to_bot(params, timeout=15):
    """POST params to the HPRC Bot OOD endpoint. Raises on non-200."""
    response = http_requests.post(f"{hprcbot_route}/HPRCapp/OOD", json=params, timeout=timeout)

    if response.status_code != 200:
        raise Exception(f"HPRC Bot returned {response.status_code}: {response.text}")
    return response


@api.route('/quota', methods=['POST'])
def request_quota():
    try:
        # --- Extract form fields ---
        directory     = request.form.get('directory')
        current_quota = request.form.get('currentQuota')
        current_files = request.form.get('currentFileLimit')
        new_quota     = request.form.get('newQuota')
        new_files     = request.form.get('newFileLimit')
        request_type  = request.form.get('requestType')
        pi_name       = request.form.get("piName")
        pi_awareness  = request.form.get('piAwareness')
        stored_data   = request.form.get('storedData')
        research_desc = request.form.get('researchDescription')
        job_size      = request.form.get('jobSize')
        storage_plan  = request.form.get('storagePlan')
        comment       = request.form.get('comment', '')
        is_buy        = request.form.get('isBuyRequest')
        expiration    = request.form.get('expiration', '')
        account_no    = request.form.get('account', '')

        user      = os.environ.get('USER', 'unknown')
        email     = get_user_email(user)
        subject   = f"[{cluster_name}] Quota Request: {user}"
        buyin     = 'yes' if is_buy == 'Yes' else 'no'

        # Build email body as fallback
        if is_buy == 'Yes':
            body = (
                f"Cluster: {cluster_name}\nUser: {user}\nDiskName: {directory}\n"
                f"Request Type: Buy-in Quota Request\nExpiration: {expiration}\n"
                f"Account: {account_no}\n\nCurrent: {current_quota} / {current_files} files\n"
                f"Requesting: {new_quota}TB / {new_files} files\n\nComment: {comment}"
            )

        else:
            justification = (
                f"PI aware: {pi_awareness}\nStored data: {stored_data}\n"
                f"Research: {research_desc}\nJob size: {job_size}\n"
                f"Long-term plan: {storage_plan}"
            )

            body = (
                f"Cluster: {cluster_name}\nUser: {user}\nDiskName: {directory}\n"
                f"Request Type: {request_type}\n\nCurrent: {current_quota} / {current_files} files\n"
                f"Requesting: {new_quota}TB / {new_files} files\n\n{justification}\n\nComment: {comment}"
            )

        # --- Attempt HPRC Bot ---
        try:
            try:
                fmt_quota = clean_number(current_quota)
                fmt_files = int(re.sub(r"[^\d]", "", current_files)) if current_files else None
                fmt_new_quota = clean_number(new_quota)
                fmt_new_files = int(re.sub(r"[^\d]", "", new_files)) if new_files else None

            except ValueError:
                fmt_quota = current_quota
                fmt_files = current_files
                fmt_new_quota = new_quota
                fmt_new_files = new_files

            params = {
                'request_type': 'Quota', 'user': user, 'email': email,
                'cluster_name': cluster_name, 'directory': directory,
                'current_quota': fmt_quota, 'current_file_limit': fmt_files,
                'desired_disk': fmt_new_quota, 'total_file_limit': fmt_new_files,
                'request_justification': (
                    f"PI aware: {pi_awareness}\nStored data: {stored_data}\n"
                    f"Research: {research_desc}\nJob size: {job_size}\nPlan: {storage_plan}"
                ),
                'comment': comment, 'confirmBuyin': buyin,
                'has_previous': request_type == 'Extension',
                'request_until': expiration,
                'account_number': account_no if buyin == 'yes' else '',
                'project_pi': pi_name
            }
            _post_to_bot(params, timeout=5)
            return jsonify({"message": "Quota request submitted via HPRC Bot.", "status": "bot_success"}), 200

        except Exception as bot_error:
            logging.warning(f"HPRC Bot failed, falling back to email: {bot_error}")

        # --- Email fallback ---
        try:
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From']    = email
            msg['To']      = request_email

            with smtplib.SMTP("smtp.tamu.edu", 25) as server:
                failures = server.send_message(msg)

            if not failures:
                return jsonify({"message": "Quota request submitted via email.", "status": "email_success"}), 200
            return jsonify({"message": "Quota request logged, some email issues occurred.",
                            "status": "email_partial", "details": str(failures)}), 200

        except Exception as email_error:
            logging.error(f"Email fallback failed: {email_error}")
            return jsonify({
                "message": f"Request logged but could not send email. Contact {help_email}.",
                "status": "email_failed", "error": str(email_error)
            }), 202

    except Exception as e:
        logging.error(f"Quota request processing failed: {e}")
        return jsonify({"error": f"Failed to process quota request: {e}. Contact {help_email}."}), 500


@api.route('/group', methods=['POST'])
def request_group():
    try:
        def _split_netids(s):
            return [l.strip() for l in s.strip().splitlines() if l.strip()]

        group_type    = request.form.get('groupRequest')
        group_name    = request.form.get('groupName', '').strip()
        group_members = request.form.get('groupMembers', '')
        group_add     = request.form.get('groupAdd', '')
        group_remove  = request.form.get('groupRemove', '')
        comments      = request.form.get('comments', '')

        user  = os.environ.get('USER', 'unknown')
        email = get_user_email(user)

        params = {
            'request_type': 'Group', 'user': user, 'email': email,
            'cluster_name': cluster_name, 'comments': comments,
            'new_group': group_type == 'cgroup',
        }

        if group_name:
            dir_info = get_group_directory_info(group_name)
            params['group_name'] = group_name
            params['directory']  = dir_info['directory']

        action_map = {
            'cgroup':  ('createGroup',   _split_netids(group_members)),
            'madd':    ('addMembers',    _split_netids(group_add)),
            'mremove': ('deleteMembers', _split_netids(group_remove)),
            'rgroup':  ('requestAccess', []),
        }

        if group_type not in action_map:
            return jsonify({"error": f"Unknown group request type: {group_type}"}), 400

        action, targets = action_map[group_type]
        params['action'] = action
        params['Add']    = action
        if targets:
            params['target_users'] = targets

        _post_to_bot(params)
        return jsonify({"message": "Group request submitted successfully.", "status": "bot_success"}), 200

    except Exception as e:
        logging.error(f"Group request failed: {e}")
        return jsonify({"error": f"Failed to process group request: {e}. Contact {help_email}."}), 500


@api.route('/help', methods=['POST'])
def request_help():
    try:
        user  = os.environ.get('USER', 'unknown')
        email = get_user_email(user)

        help_type         = request.form.get("helpRequest", "").strip()
        direct_topic      = request.form.get("help_topic", "").strip()
        direct_issue_desc = request.form.get("issue_description", "").strip()

        params = {
            "request_type": "Help", "user": user, "email": email,
            "cluster_name": cluster_name,
            "help_topic": help_type or direct_topic,
            "issue_description": "", "error_message": "",
            "job_file_path": "", "job_id": "",
            "program_file_path": "", "additional_information": "",
        }

        if help_type == "software":
            params["issue_description"]    = f"{request.form.get('softwareName')} (v{request.form.get('softwareVersion')}) - Toolchain: {request.form.get('softwareToolChain')}"
            params["program_file_path"]    = request.form.get("softwareLink", "")
            params["additional_information"] = request.form.get("softwareInfo", "")

        elif help_type == "jobs":
            params["job_id"]           = request.form.get("jobID", "")
            params["job_file_path"]    = request.form.get("jobLocation", "")
            params["issue_description"] = request.form.get("jobIssue", "")
            params["error_message"]    = request.form.get("jobErrors", "")

        elif help_type == "accounts":
            acct_type = request.form.get("accountType", "")

            if acct_type == "general":
                params["issue_description"] = request.form.get("jobIssue", "")
            elif acct_type == "addAccount":
                params["issue_description"] = f"Add user {request.form.get('accountUser')} to account {request.form.get('accountNumber')}."
            elif acct_type == "transferSU":
                params["issue_description"] = f"Transfer {request.form.get('jobIssue')} SUs from {request.form.get('accountNumber')} to {request.form.get('accountUser')}."

        elif help_type == "other":
            params["issue_description"] = request.form.get("otherDescription", "")

        if direct_topic == "Other" and direct_issue_desc:
            params["issue_description"] = direct_issue_desc

        _post_to_bot(params)
        return jsonify({"message": "Help request submitted successfully.", "status": "bot_success"}), 200

    except Exception as e:
        logging.error(f"Help request failed: {e}")
        return jsonify({"error": f"Failed to process help request: {e}. Contact {help_email}."}), 500


@api.route('/software', methods=['POST'])
def request_software():

    try:
        user  = os.environ.get('USER', 'unknown')
        email = get_user_email(user)

        name     = request.form.get("softwareName", "").strip()
        version  = request.form.get("softwareVersion", "").strip()
        link     = request.form.get("softwareLink", "").strip()
        chain    = request.form.get("softwareToolChain", "").strip()
        info     = request.form.get("softwareInfo", "").strip()
        category = request.form.get("softwareCategory", "").strip()

        if not name:
            raise ValueError("Software name is required.")

        params = {
            "request_type": "Software", "user": user, "email": email,
            "cluster_name": cluster_name,
            "software_name": name, "software_version": version,
            "software_link": link, "toolchains": chain,
            "request_justification": f"Category: {category}\n{info}",
            "additional_notes": "",
        }

        _post_to_bot(params)
        return jsonify({"message": "Software request submitted successfully.", "status": "bot_success"}), 200

    except Exception as e:
        logging.error(f"Software request failed: {e}")
        return jsonify({"error": f"Failed to process software request: {e}. Contact {help_email}."}), 500


@api.route('/account', methods=['POST'])
def request_account_purchase():
    try:
        user  = os.environ.get('USER', 'unknown')
        email = get_user_email(user)
        what      = request.form.get("purchaseWhat", "").strip()
        who       = request.form.get("purchaseWho", "").strip()
        due_raw   = request.form.get("purchaseDue", "").strip()
        accts_raw = request.form.get("purchaseAccounts", "").strip()
        notes     = request.form.get("purchaseNotes", "").strip()

        try:
            due = datetime.strptime(due_raw, "%Y-%m-%d") if due_raw else None

        except ValueError:
            due = None

        accounts = [a.strip() for a in accts_raw.split(",") if a.strip()]

        params = {
            "request_type": "Purchase", "user": user, "email": email,
            "cluster_name": cluster_name,
            "what": what, "who": who,
            "due": due.isoformat() if due else "",
            "accounts": accounts, "additional_notes": notes,
        }

        _post_to_bot(params)
        return jsonify({"message": "Account purchase request submitted successfully.", "status": "bot_success"}), 200

    except Exception as e:
        logging.error(f"Account request failed: {e}")
        return jsonify({"error": f"Failed to process account purchase request: {e}"}), 500

@api.route('/submit_acknowledgement', methods=['POST'])
def submit_acknowledgement():
    try:
        user  = os.environ.get('USER', 'unknown')
        email = get_user_email(user)
        doi            = request.form.get("doi", "").strip()
        additional     = request.form.get("additionalInfo", "").strip()
        timestamp      = request.form.get("timestamp", "").strip()

        if not doi and not additional:
            return jsonify({"error": "At least one field (DOI or Additional Information) must be provided"}), 400

        params = {
            "request_type": "Acknowledgement", "user": user, "email": email,
            "cluster_name": cluster_name,
            "doi": doi, "additional_info": additional, "timestamp": timestamp,
        }

        _post_to_bot(params)
        return jsonify({"message": "Acknowledgement submitted successfully.", "status": "bot_success"}), 200

    except Exception as e:
        logging.error(f"Acknowledgement submission failed: {e}")
        return jsonify({"error": f"Failed to process acknowledgement: {e}"}), 500


@api.route('/announcement', methods=['GET'])
def get_announcement():
    try:
        announcement = {
            "messages": [
                "Welcome to HPRC!",
            ],
            "updated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

        }
        return jsonify({"announcement": announcement}), 200

    except Exception as e:
        logging.error(f"Failed to fetch announcement: {e}")
        return jsonify({"error": "Unable to fetch announcement"}), 500


