require 'open3'

class GroupRequest

    def compose_email(group_name, cluster_name,target_users, groupdir, action,
        new_group, comments)

        user = ENV["USER"]
        body =  "User: #{user}\n" \
                "Cluster: #{cluster_name}\n" \
                "GroupName: #{group_name}\n" \
                "target_users: #{target_users}\n" \
                "GroupDirName: #{groupdir}\n" \
                "action: #{action}\n" \
                "NewGroup: #{new_group}\n"\
                "Comments: #{comments}\n" 

        body.strip
    end

    def generate_email(params)
        group_name = params[:group_name]
        cluster_name = params[:cluster_name]
        target_users = params[:target_users]
        groupdir = params[:groupdir]
        action = params[:Add]
        new_group=params[:new_group]
        comments = params[:comments]
      

        subject = "GroupReq"
        body = compose_email(group_name,cluster_name, target_users, groupdir,action,
        new_group,comments)
        return [subject, body]
    end

end
