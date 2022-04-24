# Vitalik Number
This is a modification of the Erdos Number, built on the Lens Protocol

## What is Vitalik Number
If Alice & Bob have collaborated on a github repo, and Bob & Vitalik have collaborated on a different repo 
- Vitalik has Vitalik Number 0, by definition
- Bob has Vitalik Number 1 because he collaborated with Vitalik
- Alice has Vitalik Number 2 because she collaborated with Bob who collaborated with Vitalik

## Running
```
npm install
npm start
```

You will need to update the `.env` file with 
```
SESSION_SECRET="some random secret for session storage"
GITHUBKEY="github personal key"
```

## What's implemented
All the user profiles are created on [LensProtocol](https://lens.dev)
A github crawling determines the potential Vitalik Number. However, this crawling is not deterministic because Github often rate limits API requests. 
So, the Vitalik Number is calculated based on the users who have claimed their profile on the Lens Protocol using this tool. 
The Tool also suggests whom the user should invite to improve their Vitalik Number Score.

*Built as a part of EthAmsterdam*