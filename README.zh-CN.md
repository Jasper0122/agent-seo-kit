# agent-seo-kit

四个 Claude Code skill，把一条搜索流水线从头跑到尾：先量自己在搜索里的位置，再量 AI 回答里有没有你，选题、写稿、然后去拿链接。所有对外的请求都走 [Monid](https://monid.ai)，一把 key、一个余额，不用分别去签四家的合同。

```
竞品关键词 ──→ seo-intake ──┐
                            ├──→ content-library.json ──→ content-thicken ──→ 稿子
AI 回答探针 ──→ geo-monitor ┘        │
             │                       └──→ 给合作方的植入位
             └──→ 被引用的站点排序 ──→ backlink-outreach ──→ 外联 + 外链
```

## 四个 skill

| Skill | 干什么 |
|---|---|
| **seo-intake** | 拉自己域名和每个竞品的自然搜索关键词，本地算差集，然后把每个词路由到唯一能帮到它的那个动作：write-new、striking、build-depth、defend、noise。 |
| **geo-monitor** | 量 AI 回答引擎有没有提到你、推荐你、引用你。把一套固定的真人问题库投给回答引擎，识别三个信号加竞品，把「对手被点名而我们没有」变成可追踪的工单。可选：跨八个 AI 助手做引用次数交叉核对。 |
| **content-thicken** | 写稿驱动器。从融合后的选题库里拿一个目标，拉出它必须回答的真实问题，按模板契约写长文，做确定性校验，停在预览。 |
| **backlink-outreach** | 外链对象不是搜「xx 博客」搜出来的，而是 AI 回答你的品类问题时真正引用过的页面。从调研到落地核验十步，tracker 自己强制状态规则。 |

## 为什么数据层用 Monid

这条流水线需要关键词工具、回答引擎、Reddit 搜索、网页抓取、公司信息补全、邮箱验证。分开买就是五次注册、五个起步价、五张发票，而且大部分时间闲置。

Monid 是给 agent 用的工具层：一把 key、一个余额就能都够到，discover 和 inspect 免费，只有真调用才计费。这个 repo 自己不持有任何 API key。

**一次性配置：**

```bash
npm install -g @monid-ai/cli@latest
monid setup
monid keys add -k <在 https://app.monid.ai/access/api-keys 生成的 key> -l main
```

顺手把官方的 [`monid` skill](https://monid.ai/SKILL.md) 也装上，让 agent 自己去查端点和价格：

```
set up https://monid.ai/SKILL.md
```

### SEO 报表需要开权限，免费

Ahrefs 和 Semrush 在 Monid 上是需要单独开通的权限，不是公开端点。新工作区用 `monid discover` 能看到它们，真跑的时候仍然会被权限拦掉。

**开通是免费的。** 发邮件到 **zongrong@monid.ai**，或者扫本文末尾的群二维码进群问。

其余部分（回答引擎、Reddit、网页抓取、信息补全、邮箱验证）在普通工作区上直接可用，不需要额外动作。

## 安装

```bash
git clone https://github.com/Jasper0122/agent-seo-kit.git
cd agent-seo-kit
cp seo.config.example.json seo.config.json   # 然后填进去
cp -r skills/* ~/.claude/skills/             # Claude Code 按目录名自动识别
```

零依赖，Node 20 以上。

`seo.config.json` 里有三个字段决定产出有没有用：

- `site.domain`：你要优化的域名。
- `site.brandTerms`：你的品牌词和常见拼错。不填的话品牌导航词会压住所有均值，流水线会去给「已经找到你的人」写文章。
- `competitors`：手工挑。新域名上自动识别竞品根本不成立，返回的是一个目录站和一个社交网络，相关度接近零。

## 跑起来

```bash
# 搜索这一半
node scripts/pull-organic.mjs --dry-run    # 只报价，不花钱
node scripts/pull-organic.mjs
node scripts/classify.mjs                  # 免费

# AI 回答这一半
cp data/geo-registry.example.json data/geo-registry.json   # 然后换成你自己的问题
node scripts/run-geo.mjs --dry-run
node scripts/run-geo.mjs
node scripts/geo-dictionary.mjs --min 2    # 采集被点名的产品，只出草稿
node scripts/redetect.mjs                  # 免费，人工确认草稿之后跑
node scripts/geo-opportunities.mjs
node scripts/geo-ledger.mjs

# 融合，然后写
node scripts/build-content-library.mjs
node scripts/questions-for.mjs "<你的目标关键词>"

# 外链
node scripts/prospects-from-geo.mjs --min 2
node scripts/tracker.mjs list

# 可选：跨八个 AI 助手看广度
node scripts/ai-visibility.mjs --dry-run
```

## 花多少钱

每个付费脚本都能先 `--dry-run` 报价，跑完打印实际花销。旋钮如下：

| 脚本 | 按什么计费 | 旋钮 |
|---|---|---|
| `pull-organic` | 按关键词行 | `limits.rowsPerDomain`。Ahrefs 每行大约是 Semrush 的 36 倍，Semrush 单次能拉得深得多。改一个字段就能切。 |
| `run-geo` | 按问题条数 | 题库大小，以及 `--limit` |
| `questions-for` | 按 Reddit 帖子数 | `--max` |
| `ai-visibility` | 按域名个数 | 带几个竞品 |
| `prospects-from-geo --authority` | 按站点个数 | 给多少个 prospect 打分 |
| 其余 | 免费 | 只读已经买回来的数据 |

`limits.maxSpendPerRunUsd` 是关键词拉取的硬上限，超了直接拒绝，不是警告。

## 就算你不跑这套，这几条也值得抄走

- **每个选题都要能追到真实需求证据。** 关键词工具、真实帖子、一手调研，绝不能是模型的建议。选题一旦是编的，下游每一个数字都只是装饰。
- **对的词配错的动作等于什么都没做。** 改标题只对「已经被展示」的页面有用，对排在 40 名的词改标题，什么也不会发生。
- **在 AI 回答里输掉是无声的。** 没有点击、没有来源、没有日志。唯一的知情方式是自己把问题问一遍并把答案存下来。
- **两类问题绝不能平均。** 带品牌名的问题几乎必然提到品牌，跟泛需求问题混在一起会算出一个好看但什么都不描述的数字。
- **推荐检测是启发式的，而且已经错过。** 报任何非零推荐率之前先读证据原文。提及和引用是确定性的，推荐不是。
- **被限流的一行和真实的缺席，写下来之后长得一模一样。** 所以错误按错误记录，并从所有分母里剔除。
- **换了解析器就要重开基线。** 免费重读已存答案，不要拿两个检测器跑出来的两轮做对比。
- **`sent` 必须带 message id。** 写完的草稿不等于发出去了，把两者混同的 agent 会在下周告诉你「对方一直没回」。

## 故意不放进来的东西

- **没有业务数据。** 流水线读写的一切都在 `data/`，除示例题库外全部 gitignore。
- **没有凭证。** 只有一把 Monid key，由 Monid CLI 存在你自己机器上。
- **没有关于你产品的任何预设。** `content-thicken` 读一份你自己写一次的 `PRODUCT.md`，模板在它的 `references/` 里。

## 进群

SEO / GEO 交流群。想免费开 Ahrefs 或 Semrush 权限，觉得发邮件太慢的话也可以进群直接问。

<img src="assets/wechat-group.jpg" alt="SEO GEO 交流群微信二维码" width="320">

二维码过期了就发邮件到 **zongrong@monid.ai**，会给你一个新的。

[English](README.md) · MIT 协议。
