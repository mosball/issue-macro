//모듈
const puppeteer = require('puppeteer')
const fs = require('fs')
const os = require('os')

//정보
const {email, pw, nickName, repositoryName} = JSON.parse(fs.readFileSync('./setting.json', 'utf8'))

//URI
const loginURI         = 'https://github.com/login'
const issueSettingsURI = `https://github.com/${nickName}/${repositoryName}/settings`
const issueURI         = `https://github.com/${nickName}/${repositoryName}/issues/new`

//태그 선택자
const emailField  = 'input#login_field'
const pwField     = 'input#password'
const loginBtn    = 'input[type=submit]'

const issueCheckbox   = 'input#issue-feature'
const issueTitleField = 'input#issue_title'
const issueForm       = 'form#new_issue'

let browser = null
let page    = null

async function startPuppeteer() {
  browser = await puppeteer.launch({
    headless: false
  })

  page = await browser.newPage()

  //깃헛 로그인 페이지로 이동
  await page.goto(loginURI)

  //로그인 정보 입력
  await page.evaluate((email, pw, emailField, pwField) => {
    document.querySelector(emailField).value = email
    document.querySelector(pwField).value = pw
  }, email, pw, emailField, pwField)

  //로그인 버튼 클릭 후 응답 기다리기
  await Promise.all([page.click(loginBtn), page.waitForNavigation()])

  //셋팅에서 이슈 체크박스 클릭
  await page.goto(issueSettingsURI)

  const checkbox = await page.$(issueCheckbox);
  const checked  = await (await checkbox.getProperty('checked')).jsonValue()
  
  //체크되어 있지 않을때만 체크
  if (!checked) {
    await page.click(issueCheckbox)
    await waitTime(1000)
  }

  //이슈 파일에서 이슈 내용 가져오기
  const osType = os.type().toUpperCase()
  const line   = osType.includes('WINDOW') ? '\r\n' : osType.includes('LINUX') ? '\n' : '\r'
  const issues = fs.readFileSync('./issues', 'utf8').split(line)

  for (let e of issues) {
    await page.goto(issueURI)

    //이슈 타이틀 초기화
    await page.evaluate((issueTitleField) => {
      document.querySelector(issueTitleField).value = ''
    }, issueTitleField)

    //이슈 타이틀 입력
    await page.type(issueTitleField, e, {delay : 30})

    //이슈 등록
    await Promise.all([page.$eval(issueForm, form => form.submit()), page.waitForNavigation()])
  }

  await browser.close()
}

function waitTime(time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

startPuppeteer()