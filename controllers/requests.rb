require_relative '../models/mailer.rb'
require_relative '../models/request_help.rb'
require_relative '../models/request_guidedhelp.rb'
require_relative '../models/request_quota.rb'
require_relative '../models/request_software.rb'
require_relative '../models/request_group.rb'

require "sinatra/config_file"
require 'net/http'
require 'json'


def WriteLog(request_type, body)
    log_file_name = request_type.downcase() + "_log.txt"
        log_file_name.gsub!(/\s/,"_")
    File.write("logs/#{log_file_name}", body, mode: "a")
    # add a new line
    #File.write("logs/#{log_file_name}", "\n", mode: "a")
end

def WriteErrorLog(request_type, body)
    error_file_name = request_type.downcase() + "_error.txt"
        error_file_name.gsub!(/\s/,"_")
    File.write("logs/#{error_file_name}", body, mode: "a")
    # add a new line
    #File.write("logs/#{log_file_name}", "\n", mode: "a")
end

def WriteDebugLog(request_type, body)
    debug_file_name = request_type.downcase() + "_debug.txt"
        debug_file_name.gsub!(/\s/,"_")
    File.write("logs/#{debug_file_name}", body, mode: "a")
    # add a new line
    #File.write("logs/#{log_file_name}", "\n", mode: "a")
end

def GenerateEmailBody(params)
    if params["request_type"] == "Software"
        newRequest = SoftwareRequest.new
    elsif params["request_type"] == "Help"
        newRequest = HelpRequest.new
    elsif params["request_type"] == "Quota"
        newRequest = QuotaRequest.new
    elsif params["request_type"] == "Group"
        newRequest = GroupRequest.new
    elsif params["request_type"] == "GuidedHelp"
        newRequest = GuidedHelpRequest.new
    elsif params["request_type"] == "JobHelp"
        newRequest = JobHelpRequest.new
    end
    newRequest.generate_email(params)
end

def SendEmail(subject, body, success_msg, failure_message)
        
    body = body.strip.gsub(/\r\n?/, "\n")

    mailer = Mailer.new(settings.request_email)
    status  = mailer.send_email(subject, body)

    message = nil
    if status.success?
        message = success_msg
    else
        message = failure_message
    end

    message
end

def SendRequestEmail(subject, body, request_type)
    success_msg = "Your #{request_type} Request has been sent. A copy of the request has been sent to you via RT"
    failure_msg = "An error has occurred. Please email us at #{settings.help_email}"
    result_msg = SendEmail(subject, body, success_msg, failure_msg)
    result_msg
end

def SendtoHPRCBot(params)
    uri = URI.parse("#{settings.hprcbot_route}/HPRCapp/OOD")
    http = Net::HTTP.new(uri.host,uri.port)
    req = Net::HTTP::Post.new(uri.path, initheader = {'Content-Type' =>'application/json'})
    req.body = params.to_json
    res = http.request(req)
    res
end


def ExtractEmail()
	if "#{settings.cluster_name}" == "ACES"
		email = `grep $USER /usr/local/etc/email_mapping.access.login | cut -d":" -f2`
	elsif "#{settings.cluster_name}" == "Launch"
		email = `grep $USER /usr/local/etc/email_mapping.access.login | cut -d":" -f2`
	elsif "#{settings.cluster_name}" == "FASTER-ACCESS"
	       email =  `grep $USER /usr/local/etc/email_mapping.xsede.login | cut -d":" -f2`	
	else
		email = ENV["USER"] + "@tamu.edu"	
	end     
	email = email.gsub("\n",'')
	email = email.gsub('"','')
	WriteDebugLog("requests", ENV["USER"] +" : " + email + "\n");
	email
end

def HandleRequest(params)
   params["user"] = ENV["USER"]
   params["email"] = ExtractEmail()
   request_type = params["request_type"]
   begin
      res  = SendtoHPRCBot(params)
      WriteLog(params["request_type"],"\n")
      WriteLog(params["request_type"], params )
      WriteLog(params["request_type"], "\n" )
      result_msg = "Request ticket has been Created and a copy sent through RT" 
   rescue => e
      WriteErrorLog(params["request_type"], e.message)
      subject, body = GenerateEmailBody(params)
      result_msg = SendRequestEmail(subject, body, params["request_type"])
   end
   result_msg
end


class RequestsController < Sinatra::Base
    register Sinatra::ConfigFile
    config_file '../config.yml'

    result_msg = "Error! Request type not found! Please email us at #{settings.help_email}"
    post '/request/quota' do
		params["request_type"] = "Quota"
        params["confirmBuyin"] = params.fetch(:confirmBuyin, "no")
        result_msg = HandleRequest(params)
	end
	  
	post '/request/software' do
		params["request_type"] = "Software"
        params["system_wide"] = params.fetch(:system_wide, "no")
        result_msg = HandleRequest(params)
	end
    post '/request/group' do
		params["request_type"] = "Group"
        params["new_group"] = params.fetch(:new_group, "False")
        result_msg = HandleRequest(params)
	end

	post '/request/help' do
		params["request_type"] = "Help"
        result_msg = HandleRequest(params)
	end
    post '/request/guidedhelp' do
		params["request_type"] = "GuidedHelp"
        result_msg = HandleRequest(params)
	end
    post '/request/jobhelp' do
        
		params["request_type"] = "JobHelp"
        result_msg = HandleRequest(params)
        result_msg
	end
    result_msg
end
