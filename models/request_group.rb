require 'open3'

class GroupRequest

    def compose_email(group_name, members_to_add, groupdir, 
        new_group, members_to_remove,delgroup, comments)

        user = ENV["USER"]
        body =  "User: #{user}\n" \
                "GroupName: #{group_name}\n" \
                "MembersToAdd: #{members_to_add}\n" \
                "GroupDirName: #{groupdir}\n" \
                "NewGroup: #{new_group}\n"\
                "MembersToRemove: #{members_to_remove}\n" \
                "DelGroup: #{delgroup}\n" \
                "Comments: #{comments}\n" 

        body.strip
    end

    def generate_email(params)
        group_name = params[:group_name]
        members_to_add = params[:members_to_add]
        groupdir = params[:groupdir]
        new_group=params[:new_group]
        members_to_remove= params[:members_to_remove]
        delgroup = params[:delgroup]
        comments = params[:comments]
      

        subject = "GroupReq"
        body = compose_email(group_name, members_to_add, groupdir, 
        new_group, members_to_remove,delgroup, comments)
        return [subject, body]
    end

end
