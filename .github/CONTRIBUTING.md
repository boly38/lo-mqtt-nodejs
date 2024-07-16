[ < Back](../README.md)

# HowTo Contribute

Please create an [issue](https://github.com/boly38/lo-mqtt-nodejs/issues) describing your goal / question / bug description...

If you're interested in an existing issue, please contribute by up-voting for it by adding a :+1:.

If you want to push some code :
- fork and prepare a feature-git-branch, then create a [pull request](https://github.com/boly38/lo-mqtt-nodejs/pulls) that link your issue.

You could also be critic with existing ticket/PR : all constructive feedbacks are welcome.

# Maintainer HowTos
## HowTo create a fresh version
- use patch or minor or major workflow

this will make a new version and on version tag, the main ci workflow will push a new npmjs version too.

## HowTo release using Gren

```bash
# provide PAT with permissions to create release on current repository
export GREN_GITHUB_TOKEN=your_token_here
# one time setup
npm install github-release-notes -g

git fetch --all && git pull
# make a release vX with all history
export VERSION=v1.0.1
export PREVIOUS_VERSION=v1.0.0
gren release --data-source=prs -t "${VERSION}" --milestone-match="${VERSION}"
# overrides release vX with history from vX-1
gren release --data-source=prs -t "${VERSION}".."${PREVIOUS_VERSION}" --milestone-match="${VERSION}" --override
```
