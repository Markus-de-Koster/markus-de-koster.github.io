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





