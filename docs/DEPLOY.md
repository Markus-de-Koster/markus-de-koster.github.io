# Deploy

## Development (local)

```bash
bundle exec jekyll serve
```

## Deployment (GitHub Pages)

- in '_config.yml', set `url` and `baseurl` to the correct values
- push to `main` branch
- GitHub Actions will deploy to `gh-pages` branch

## Deployment (hosted server)

- in '_config.yml', set `url` and `baseurl` to the correct values
- build the site
```bash
JEKYLL_ENV=production bundle exec jekyll build
```
- upload the contents of the `_site` folder to the web server myurl.com > httpdocs folder



## Full script
- set up plesk remote
- `git remote add plesk ssh://`
- set up worktree for deploy branch `git worktree add -b deploy ../_deploy`

```bash
cd .. # go to parent folder (repo root)
# 1) build locally
JEKYLL_ENV=production bundle exec jekyll build

# 2) copy build output into the deploy worktree
rsync -a --delete --exclude='.git' --exclude='.git/' _site/ ../_deploy/

# 3) commit & push
cd ../_deploy
git add -A
git commit -m "Deploy: $(date -u +%FT%TZ)"
git push plesk deploy
```

