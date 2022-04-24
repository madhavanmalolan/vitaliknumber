var express = require('express');
var router = express.Router();
const { ethers } = require("ethers");
const { create } = require('ipfs-http-client');


const { ping, generateChallenge, authenticate, getProfiles, createProfile, createFollowTypedData, following, createPostTypedData, getPublications } = require('../models/lens-queries');
const { getRepos, getContributors } = require('../models/github-queries');
const { disableFragmentWarnings } = require('@apollo/client');
const { path } = require('../app');
const { ProvidedRequiredArgumentsRule } = require('graphql');
const { PostModel } = require('../models/temp-post');


const ipfs = create('https://ipfs.infura.io:5001');

const RequireGithubLogin = (req, res, next) => {
  if(!req.session.github)
    return res.redirect('/');
  req.session.github.login = "vaibhavchellani";
  next();
}

const dfs = async (username, path, maxDepth) => {
  console.log("username, path:", username, path, path.length, maxDepth);
  console.log("here-1")
  if(path.includes("vbuterin")) return path;
  if(username == "vbuterin") return [...path, 'vbuterin'];
  if(path.length == maxDepth) return [];
  console.log("here-2")
    const repos = await getRepos(username);
    console.log("repos2", repos);
    for(let i = 0; i < repos.length; i+= 1){
      const repo = repos[i];
      console.log("repo name", repo.repo_name);
      if(!repo.repo_name)
        continue;
      console.log("reporepo",repo);
      var contributors;
      try{
        contributors = (await getContributors(repo.owner, repo.repo_name)).data;
      }
      catch(e){
        console.error(e);
        continue;
      }
      console.log(contributors);
      if(!contributors)
        continue;
      
      for(let j = 0 ; j < contributors.length; j += 1){
        const contributor = contributors[j];
        if(contributor.login == username)
          continue;
        if(path.includes(contributor.login))
          continue;
        console.log("DFS...", contributor.login);
        pathToVitalik = await dfs(contributor.login, [...path, contributor.login], maxDepth);
        
        if(pathToVitalik.includes('vbuterin')){
          return pathToVitalik;
        }
      }
    }  
  return [];
}


const lensDfs = async (address, path, maxDepth) => {
  if(path.length == maxDepth) return 10;
  console.log(address);
  const followings = (await following(address)).data.following.items;
  console.log("followings", followings);
  for(i in followings){
    const contributor  = followings[i];
    if(contributor.handle == "vitalikscorevbuterin"){
      return [...path, 'vbuterin'];
    }
    const pathToVitalik = lensDfs(contributor.ownedBy, [...path, contributor.handle], maxDepth);
    if(pathToVitalik.includes("vitalikscorevbuterin"))
      return pathToVitalik;
  }
  return [];
}


router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/profile', RequireGithubLogin, (req, res) => {
  console.log(req.session.github);
  res.render('profile', { username : "madhavanmalolan" });
});

router.get('/api-login-text', async (req, res) => {
  console.log(req.query);
  const challenge = await generateChallenge(req.query.address);
  const text = challenge.data.challenge.text;
  console.log(text);
  res.send(text);
})

router.post('/calculate', RequireGithubLogin, async (req, res) => {
  console.log(req.body);
  const response = await authenticate(req.body.address, req.body.signature);
  const token = response.data.authenticate.accessToken;
  console.log("github login",req.session.github.login );
  const profilesResponse = await getProfiles({ handles: [`vitalikscore${req.session.github.login}`], limit: 1 }, token);
  const profiles = profilesResponse.data.profiles.items;
  console.log(profiles);
  var myProfile ;
  if(profiles.length == 0){
    myProfile = await createProfile({ 
      handle: `vitalikscore${req.session.github.login}`,
      profilePictureUri: null,   
      followModule: {
            emptyFollowModule: true
      }
    }, token);
  }
  else {
    myProfile = profiles[0];
  }
  const repos = await getRepos(req.session.github.login, 5);
  for(i in repos){
    const repo = repos[i];
    console.log(repo);
    var contributors;
    try{
     contributors = await getContributors(repo.owner, repo.repo_name);
    }
    catch(e){
      console.error(e);
      continue;
    }
    for(j in contributors){
      const contributor = contributors[j];
      const contributorProfileResponse = await getProfiles({ handles: [`vitalikscore${contributor.login}`], limit: 1 }, token);
      if(contributorProfileResponse.data.profiles.items.length > 0){
        await(createFollowTypedData(
          {
            follow: [
              {
                profile: contributorProfileResponse.data.profiles.items[0].address,
                followModule: null
              }
            ]
          }
        ))
      }
    }
  }
  // dfs on lens
  let githubPath = [];
  for(let i = 1; i < 5; i+=1){
    let path = await (dfs(req.session.github.login, [], i));
    if(path.includes('vbuterin')){
      githubPath = path;
      break;
    }
  }

  let lensPath = [];
  for(let i = 1; i < 5; i+= 1){
    let path = await lensDfs(req.body.address, [], i);
    if(path.includes('vitalikscorevbuterin')){
      lensPath = path;
      break;
    }
  }
  const responseJson = { githubPath, lensPath };

  const cid = await ipfs.add(JSON.stringify(responseJson));
  console.log(myProfile);
  const x = await createPostTypedData({
    "profileId": myProfile.id,
    "contentURI": "ipfs://"+cid.path,
    "collectModule": {
      "freeCollectModule":  {
          "followerOnly": false
       }
      },
      referenceModule: {
          "followerOnlyReferenceModule": false
      }
  }, token);
  const temppost = new PostModel({
    username: myProfile.id,
    contentURI: JSON.stringify(responseJson)
  });
  await temppost.save();
  console.log(JSON.stringify(x));
});

router.get('/u/:username', async(req, res) => {
  const profilesResponse = await getProfiles({ handles: [`vitalikscore${req.params.username}`], limit: 1 });
  const profiles = profilesResponse.data.profiles.items;
  if(profiles.length > 0){
    const profile = profiles[0];
    console.log(profile);
    const publications = await PostModel.find({ username: profile.id });
    if(publications.length > 0)
      return res.render('user', {post: JSON.parse(publications[0].contentURI), username: "madhavanmalolan"});
  }
  res.render('error');
  
})

//vaibhavchellani

router.get('/test', async (req, res) => {
});

module.exports = router;
