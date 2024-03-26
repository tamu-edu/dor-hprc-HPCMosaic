require 'open3'

class QuotaRequest
    def generate_email(params)
      
      cluster_name = params[:cluster_name]
      user = ENV["USER"]

      current_quota = params[:current_quota]
      current_file_limit = params[:current_file_limit]

      current_used_quota = params[:current_used_disk_quota]
      current_used_file = params[:current_used_file]
      disk_name=params[:directory]
      disk_space = params[:desired_disk]
      file_limit = params[:total_file_limit]
      buy_in = params[:confirmBuyin]
      extension=params[:has_previous]
      request_until = params[:request_until]
      email=params[:email]
      justification1 = params[:request_justification1]
      justification2 = params[:request_justification2]
      justification3 = params[:request_justification3]
      justification4 = params[:request_justification4]
      justification5 = params[:request_justification5]
      # justification = params[:request_justification]
      comment = params[:comment]

      student_netid = params[:student_netid]
      
      subject = "[#{cluster_name}] Quota Request: #{user}"
      body =  "Cluster: #{cluster_name}\n" \
                "User: #{user}\n" \
                "Buy-In: #{buy_in}\n" \
                "Request Until: #{request_until}\n" \
                "DiskName :#{disk_name}\n" \
                "extension :#{extension}\n" \
                "--- CURRENT QUOTA ---\n" \
                "Current disk space: #{current_quota}\n" \
                "Current file limit: #{current_file_limit}\n" \
                "--- USED QUOTA ---\n" \
                "Used disk space: #{current_used_quota}\n" \
                "Used file count: #{current_used_file}\n" \
                "--- REQUESTING QUOTA ---\n" \
                "Requesting disk space: #{disk_space}TB\n" \
                "Requesting file limit: #{file_limit}\n" \
                "PI Email: #{email}\n" \
                "--- Justification:---- \n" \
                "Is the PI aware of this request?\n"\
                "#{justification1}\n"\
                "What data is stored with the requested quota?\n"\
                "#{justification2}\n"\
                "Briefly describe the research project that will be supported by the requested storage?\n"\
                "#{justification3}\n"\
                "What is the input/output size of the job?\n"\
                "#{justification4}\n"\
                "What is your long-term storage plan for your data after the quota increase expires?\n"\
                "#{justification5}\n"\
                # "Justification: #{justification}\n" \
                "Comment: #{comment}\n" \
                "Student Netid or Group Name: #{student_netid}"
        
      body = body.strip
      [subject, body]
    end

    def generate_log(params)
      cluster_name = params[:cluster_name]
      user = ENV["USER"]

      current_quota = params[:current_quota]
      current_file_limit = params[:current_file_limit]

      current_used_quota = params[:current_used_disk_quota]
      current_used_file = params[:current_used_file]
      disk_name=params[:directory]
      disk_space = params[:desired_disk]
      file_limit = params[:total_file_limit]
      student_netid = params[:student_netid]
      request_until = params[:request_until]
      extension=params[:has_previous]

      log =  "Cluster: #{cluster_name}    " \
                "User: #{user}    " \
                "Extension: #{extension}    " \
                "DiskName: #{disk_name}    " \
                "Current disk space: #{current_quota}    " \
                "Current file limit: #{current_file_limit}    " \
                "Used disk space: #{current_used_quota}    " \
                "Used file count: #{current_used_file}    " \
                "Student Netid: #{student_netid}    " \
                "Request Until: #{request_until}    " \
                "Requesting disk space: #{disk_space}TB    " \
                "Requesting file limit: #{file_limit}\n" 
      log = log.strip
      log
    end
end
