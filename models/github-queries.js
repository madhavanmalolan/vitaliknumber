const { Octokit, App } = require("octokit");
const axios = require('axios');
const octokit = new Octokit({ auth: process.env.GITHUBKEY });

module.exports.getRepos = async (username, maxPages = 1) => {
    let items = [];
    let reposSet = new Set();
    let page = 1;
    while(true){
        const url = `https://api.github.com/search/issues?q=type%3apr+state%3aclosed+author%3a${username}&per_page=100&page=${page}`;
        console.log(url);
        if(page> maxPages)
            break;
        page+=1;

        let commits = [];
        try {
            commits = (await axios.get(url, { headers: {"Authorization" : `Bearer ${process.env.GITHUBKEY}`} })).data.items;
        }
        catch(e){
            console.error(e);
        }

        if(commits.length == 0)
            break;
        for(i in commits){
            let full_name = commits[i].repository_url.replace("https://api.github.com/repos/","");
            if(commits[i].author_association == "NONE" || commits[i].comments < 5)
                continue;
            if(reposSet.has(full_name))
                continue;
            reposSet.add(full_name);
            const [owner, repo] = full_name.split("/");
            if(owner.includes('['))
                continue;
            
            items.push({ owner, repo_name: repo });
        }
        

    }
    console.log(items);
    return items;
}

module.exports.getContributors = async (owner,repo) =>{
    return await octokit.request('GET /repos/{owner}/{repo}/contributors', {
        owner,
        repo
    });  
}