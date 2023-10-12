require 'open3'

class GroupRequest

    def compose_email(group_name, cluster_name,members_to_add, groupdir, addMembers,deleteMembers,addDelegate,removeDelegate,
        new_group,delgroup, comments)

        user = ENV["USER"]
        body =  "User: #{user}\n" \
                "Cluster: #{cluster_name}\n" \
                "GroupName: #{group_name}\n" \
                "NewGroupMembersToAdd: #{members_to_add}\n" \
                "GroupDirName: #{groupdir}\n" \
                "addMembers: #{addMembers}\n" \
                "deleteMembers: #{deleteMembers}\n" \
                "addDelegate: #{addDelegate}\n" \
                "removeDelegate: #{removeDelegate}\n" \
                "NewGroup: #{new_group}\n"\
                "DelGroup: #{delgroup}\n" \
                "Comments: #{comments}\n" 

        body.strip
    end

    def generate_email(params)
        group_name = params[:group_name]
        cluster_name = params[:cluster_name]
        members_to_add = params[:members_to_add]
        groupdir = params[:groupdir]
        addMembers = params[:addMembers]
        deleteMembers= params[:deleteMembers]
        addDelegate = params[:addDelegate]
        removeDelegate = params[:removeDelegate]
        new_group=params[:new_group]
        delgroup = params[:delgroup]
        comments = params[:comments]
      

        subject = "GroupReq"
        body = compose_email(group_name,cluster_name, members_to_add, groupdir, addMembers,deleteMembers,addDelegate,removeDelegate,
        new_group,delgroup,comments)
        return [subject, body]
    end

end
