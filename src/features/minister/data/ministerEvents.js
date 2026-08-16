// 大臣模拟器事件池（架空「大雍王朝」，纯属娱乐）
// 字段说明：
//   id / who / text    事件标识、发起人（emoji、姓名、场合）、事件描述
//   weight             随机权重，默认 1
//   minYear / maxYear / minRank   出现的年份区间与最低官阶
//   cond(s)            额外出现条件，s 为四维属性
//   options            选项列表；effects 为四维增减：sj 圣眷 / zj 政绩 / mw 名望 / jc 家财
//   risk               可选：按概率触发替代后果 { chance, effects, result }
export const ministerEvents = [
  {
    id: 'zaiqing',
    who: { emoji: '👑', name: '皇帝', tag: '早朝奏对' },
    text: '「北方三府大旱，赤地千里，流民已经到了京郊。」皇帝的手指敲着御案，「卿家怎么看？」',
    options: [
      { label: '请旨开仓放粮', effects: { zj: 12, mw: 8, jc: -4 }, result: '三日后城外施粥棚起，流民捧着粥碗高呼青天。' },
      { label: '缓报灾情，先安圣心', effects: { sj: 10, zj: -10 }, result: '奏折写得四平八稳，皇帝览毕点头。可当夜起风，你听得见城外的风声。' },
      { label: '请罢中秋灯会以节糜费', effects: { sj: -8, zj: 6, mw: 8 }, result: '灯会停办，省下的银子化作赈粮；只是宫里有人记住了你。' }
    ]
  },
  {
    id: 'guoku',
    who: { emoji: '💰', name: '户部尚书', tag: '部院值房' },
    text: '「太仓银只够支三个月了。」户部尚书把账册推过来，「你是明白人，帮着想想法子。」',
    options: [
      { label: '加征市舶商税', effects: { zj: 8, mw: -8 }, result: '银子进了太仓，各商会联手递了帖子，措辞客气，字字见血。' },
      { label: '请裁宫中用度', effects: { sj: -10, zj: 12, mw: 6 }, result: '内库的算盘打得震天响，户部同僚却对你拱手不止。' },
      { label: '挪借河工银周转', effects: { zj: -12, jc: 14, mw: -4 }, result: '账面平了，河堤上少了几船石料，你屋里多了一箱「程仪」。' }
    ]
  },
  {
    id: 'shiwen',
    who: { emoji: '👑', name: '皇帝', tag: '御花园召对' },
    text: '散朝后皇帝单独留下你：「都说朕仁厚。卿以为，朕是仁厚之君，还是软弱之君？」',
    options: [
      { label: '「陛下乃仁厚之君」', effects: { sj: 8, mw: -4 }, result: '皇帝笑了，只是笑意没有到眼底。' },
      { label: '「陛下当为雄猜之主」', effects: { sj: -8, mw: 4 }, result: '皇帝盯了你很久：「满朝上下，只有你敢说真话。」' },
      { label: '跪请恕罪，一言不发', effects: { sj: 4 }, result: '皇帝叹了口气：「你也学会了。」不知是失望，还是释然。' }
    ]
  },
  {
    id: 'weifu',
    who: { emoji: '👑', name: '皇帝', tag: '宫门外密语' },
    text: '「明日朕想出宫走走，你陪朕，换便服。」皇帝压低声音，「不许带侍卫，不许声张。」',
    options: [
      { label: '陪驾出宫', effects: { sj: 10, zj: 4, jc: -6 }, result: '一路上帝问米价、问吏治，回宫后看你的眼神都暖了三分。只是打点酒楼的银子是你出的。' },
      { label: '苦谏不可', effects: { sj: -6, mw: 4 }, result: '皇帝悻悻作罢，隔日改由别人陪驾——那人如今圣眷正隆。' },
      { label: '暗中派人护驾', effects: { sj: 6, mw: 2 }, result: '你没露面，但护驾的名单最后还是摆在了皇帝案头。皇帝什么也没说。' }
    ]
  },
  {
    id: 'cizhai',
    who: { emoji: '👑', name: '皇帝', tag: '赐第' },
    text: '「朕把城南那座宅子赐给你了。」皇帝说得随意，「住得离宫里近些，君臣说话方便。」',
    options: [
      { label: '叩谢天恩', effects: { sj: 4, jc: 10 }, result: '宅子有三进，你搬进去那日，同僚的贺帖堆了半张案。' },
      { label: '辞谢：臣居陋巷足矣', effects: { mw: 8, sj: -4 }, result: '此事传开，士林称你有古大臣之风。皇帝看你的眼神，复杂了几分。' },
      { label: '谢恩后转手出租', effects: { jc: 12, mw: -4 }, result: '租银月月到账，京中渐渐有了些闲话。' }
    ]
  },
  {
    id: 'chujiu',
    who: { emoji: '👑', name: '皇帝', tag: '深夜召对', minYear: 5, minRank: 4 },
    text: '皇帝屏退左右，烛火摇了摇：「朕百年之后，诸子之中——你说，谁可承大统？」',
    options: [
      { label: '五体投地，不发一言', effects: { sj: 6 }, result: '皇帝盯着你看了半炷香，忽然笑了：「回去吧。」你后背全是冷汗。' },
      { label: '直言立储以嫡以长', effects: { mw: 8, sj: -8, zj: 4 }, result: '次日起，东宫属官见你皆长揖；宫里却传出了你「结交储君」的话。' },
      { label: '附和贵妃之子', effects: { sj: 8, mw: -10, zj: -4 }, result: '贵妃娘家隔日送来厚礼，朝中清流看你的眼神冷了下去。' }
    ]
  },
  {
    id: 'taihou-shengshou',
    who: { emoji: '🎎', name: '老管家', tag: '府中议事', minYear: 2 },
    text: '太后六旬圣寿将至，各衙门都在备礼。老管家来问：「咱们府上，备什么规格？」',
    options: [
      { label: '一掷千金操办', effects: { jc: -14, sj: 8 }, result: '寿宴上太后连夸你「会办事」，礼单被摆在最显眼处。' },
      { label: '亲手抄经一卷为献', effects: { jc: -2, sj: 4, mw: 8 }, result: '金玉礼堆里，一卷手抄《金刚经》被太后留在了佛堂。' },
      { label: '随众衙门公份', effects: { sj: -2 }, result: '礼单淹没在三百份贺礼里，太后没有记住你。' }
    ]
  },
  {
    id: 'changsheng-dan',
    who: { emoji: '🔮', name: '游方术士', tag: '府门外求见' },
    text: '术士献上一匣金丹：「服之延年。大人若不自己用……宫里那位，不是更合适么？」',
    options: [
      {
        label: '献给皇帝',
        effects: { sj: 12 },
        result: '皇帝大悦，赏了你一柄玉如意，还召你入殿陪炼丹。你夜夜睡不安稳。',
        risk: { chance: 0.45, effects: { sj: -12, mw: -4 }, result: '皇帝服后龙体违和，太医院跪了一地——你跪在最前面。' }
      },
      { label: '转手卖与富商', effects: { jc: 10, mw: -6 }, result: '富商千恩万谢。此事后来被写进了话本，你是个反派。' },
      { label: '逐出府门', effects: { mw: 4, zj: 2 }, result: '术士被轰走时骂骂咧咧，街坊却都赞你不好虚妄。' }
    ]
  },
  {
    id: 'xiangcai',
    who: { emoji: '👑', name: '皇帝', tag: '暖阁闲话', minRank: 4 },
    text: '「有人说，卿有相位之才。」皇帝慢悠悠剥着橘子，「你自己怎么看？」',
    options: [
      { label: '诚惶诚恐，力辞', effects: { sj: 10 }, result: '「臣才薄，万死不敢。」皇帝笑骂了一句「没出息」，把橘子分了你一半。' },
      { label: '当仁不让', effects: { sj: -10, mw: 4 }, result: '「臣愿以死报国。」殿内静得能听见炭火哔剥的声音。' },
      { label: '反荐政敌王尚书', effects: { sj: 8, mw: 6, zj: 4 }, result: '「王尚书老成谋国，胜臣十倍。」皇帝若有所思地看了你很久。' }
    ]
  },
  {
    id: 'taihou-chuixun',
    who: { emoji: '🎎', name: '太后', tag: '慈宁宫赐茶', maxYear: 3 },
    text: '太后单独召见，赐座赐茶：「皇帝年轻，朝堂的事，你要多担待。哀家……看着呢。」',
    options: [
      { label: '唯唯诺诺', effects: { sj: 4, mw: -2 }, result: '太后满意地点头，又赏了一碟点心。' },
      { label: '只谈天气与孝道', effects: { sj: 2, mw: 2 }, result: '一盏茶喝完，滴水不漏。太后再没找过你。' },
      { label: '暗示后宫不宜干政', effects: { mw: 8, sj: -8 }, result: '太后脸上的笑淡了下去。帘后站着几个人，你只看见了两个。' }
    ]
  },
  {
    id: 'hejue',
    who: { emoji: '🧰', name: '工部侍郎', tag: '部院急报' },
    text: '「兰阳决口，淹了三县！」工部侍郎满腿是泥，「堵口要银子要人。工部……只有章程，没有银子。」',
    options: [
      { label: '请旨亲赴灾区督工', effects: { zj: 14, mw: 8, sj: 4, jc: -8 }, result: '你在河堤上住了两个月，回京时黑瘦得没人认得。百姓在官道边设了香案。' },
      { label: '拨银委属下督办', effects: { zj: 6 }, result: '属办们也算尽力，堤是堵上了，账目嘛……大体清楚。' },
      { label: '隐瞒灾情，迟报', effects: { zj: -14, sj: 6, mw: -10 }, result: '灾民进了京，言官的折子也进了京。' }
    ]
  },
  {
    id: 'mijia',
    who: { emoji: '🏞️', name: '顺天府尹', tag: '署衙禀报' },
    text: '「城南米价三日涨了四成，米行只进不出。」顺天府尹搓着手，「再压不住，怕要出乱子。」',
    options: [
      { label: '开常平仓平价售米', effects: { zj: 8, jc: -4 }, result: '米价应声而落。米行掌柜们连夜开了仓，也连夜记住了你。' },
      { label: '查抄囤米的粮商', effects: { zj: 10, mw: 6, jc: 4 }, result: '罚没的米堆满粮场，穷人称快，粮商恨你入骨。' },
      { label: '市价起落，不必多管', effects: { zj: -6, mw: -6 }, result: '月底，城南果然出了乱子。' }
    ]
  },
  {
    id: 'yuan-yu',
    who: { emoji: '⚖️', name: '刑部侍郎', tag: '秋决卷宗' },
    text: '「秋决在即，有个死囚翻了供，喊了三天冤。」刑部侍郎揉着眉心，「案卷在此，你看一眼？」',
    options: [
      { label: '力主发回重审', effects: { zj: 8, mw: 10, sj: -4, jc: -4 }, result: '三个月后真凶落网。苦主在刑部门口磕头，原审官在各处递帖子骂你。' },
      { label: '维持原判', effects: { zj: -6, mw: -8 }, result: '刑场那天你告了病，没有去看。' },
      { label: '密奏请皇帝圣裁', effects: { sj: 4, zj: 4 }, result: '皇帝朱批「知道了」，案子照原样办了——但你的手是干净的。' }
    ]
  },
  {
    id: 'kongxiang',
    who: { emoji: '⚔️', name: '兵部尚书', tag: '密室推册', minRank: 3 },
    text: '兵部尚书把一本册子推到你面前，声音压得极低：「京营花名册，虚了三千人。吃空饷的那些……位高权重。」',
    options: [
      { label: '上奏揭发', effects: { zj: 10, mw: 6, sj: 4 }, result: '一场大狱，兵部换了一茬人。有人在城门外朝你的车驾扔了颗烂菜。' },
      { label: '睁一只眼闭一只眼', effects: { jc: 10, zj: -8 }, result: '月底，「兵部节余」悄悄送进了你的小金库。其实你知道那叫什么。' },
      { label: '私下劝其填补亏空', effects: { zj: 4, mw: 4 }, result: '尚书丢下册子走了。三个月后，花名册悄悄补齐了。' }
    ]
  },
  {
    id: 'kechang',
    who: { emoji: '📖', name: '门生李举人', tag: '深夜叩门' },
    text: '门生跪在你面前涕泪横流：「恩师！顺天乡试……学生夹带了，案发被拿。满朝只有恩师能救我！」',
    options: [
      { label: '递帖保他', effects: { mw: 6, sj: -8 }, result: '人是放出来了，言官弹劾你「庇护门生」的折子也上来了。' },
      { label: '大义灭亲', effects: { sj: 10, mw: -4, zj: 4 }, result: '李举人流放千里，行前在狱中给你磕了三个头。你一夜没有睡。' },
      { label: '打点刑房销毁物证', effects: { jc: -12, sj: 2, mw: 2 }, result: '银子花出去，卷宗「霉损」了。门生保住了，你的把柄也多了一层。' }
    ]
  },
  {
    id: 'liangxiang',
    who: { emoji: '🏹', name: '边关守将', tag: '八百里加急', minYear: 2 },
    text: '北虏犯边，围了云中。血奏只有八个字：「求粮求饷，迟十日，城破。」',
    options: [
      { label: '火速调粮发饷', effects: { zj: 10, sj: 4 }, result: '云中守住了。军报里写：满城皆呼朝廷不弃边民。' },
      { label: '兵凶战危，请缓图', effects: { zj: -10, sj: -4 }, result: '廷议扯了六天。第七天，云中又来了一道血奏。' },
      { label: '奏请遣使议和纳币', effects: { sj: -8, zj: 4, mw: -6 }, result: '边患暂平，朝中骂声一片：「岁币养寇！」' }
    ]
  },
  {
    id: 'kaoping',
    who: { emoji: '📋', name: '吏部考功郎中', tag: '考功司' },
    text: '「今年要评你同年的功过。」考功郎中笔墨伺候，「他与你有旧。你说，这考语怎么写？」',
    options: [
      { label: '据实而书，功过分明', effects: { zj: 6, mw: 4 }, result: '考语一出，众皆服气，连被评者都登门道谢。' },
      { label: '抬一手，多写功', effects: { mw: 4, zj: -4 }, result: '同年设宴谢你，酒过三巡，说日后必有厚报。' },
      { label: '踩一脚，少写功', effects: { sj: 4, mw: -8 }, result: '你少了一个潜在的对手，也少了一群肯对你说真话的人。' }
    ]
  },
  {
    id: 'changping-cang',
    who: { emoji: '🏞️', name: '管仓大使', tag: '常平仓' },
    text: '「常平仓的陈米发了霉，新粮还没到。」管仓的小吏搓着手，「要是上面查下来……」',
    options: [
      { label: '全数查验，报损换新', effects: { zj: 8, jc: -4 }, result: '折了多少银子你认了，仓里的米终于是能吃的米了。' },
      { label: '霉米掺新米出粜', effects: { zj: -8, jc: 8 }, result: '账面光鲜，米行怨声载道。' },
      { label: '报「雨浸无害」，原样封存', effects: { zj: -6, mw: -4 }, result: '来年开仓，米还是那些米。' }
    ]
  },
  {
    id: 'yanshang',
    who: { emoji: '🧧', name: '扬州盐商', tag: '深夜递帖', cond: (s) => s.jc < 80 },
    text: '盐商深夜求见，礼单压在茶盘底下：纹银三千两。「小的斗胆，求大人在两淮盐引的事上……抬抬手。」',
    options: [
      {
        label: '收下',
        effects: { jc: 18, mw: -8 },
        result: '银箱抬进后院，你嘱咐管家：这话，烂在肚子里。',
        risk: { chance: 0.35, effects: { jc: 18, mw: -16, sj: -6 }, result: '银箱抬进后院。翌日，都察院就有人上折，把「深夜密会」写得绘声绘色。' }
      },
      { label: '严词拒绝', effects: { mw: 10 }, result: '盐商讪讪而退。此事传开，你的门房清净了整整一个月。' },
      { label: '翌日原封退回并附信', effects: { mw: 6 }, result: '信里只有八个字：「足下厚意，心领神会。」盐商从此逢人便夸你「体面」。' }
    ]
  },
  {
    id: 'bingtan',
    who: { emoji: '🧧', name: '江南织造', tag: '节礼到府' },
    text: '夏至未至，织造监的「冰敬」已到：四色礼物，皆不逾制——外加一张两千两的银票。',
    options: [
      { label: '照单全收', effects: { jc: 14, mw: -6 }, result: '这是官场惯例——你这样安慰自己。' },
      { label: '收礼退票', effects: { jc: 6 }, result: '礼物是情分，银票是祸根。这话是老管家说的，你觉得很对。' },
      { label: '全数退回并登记造册', effects: { mw: 12, sj: 2 }, result: '织造监的脸色很不好看，都察院的御史却把你记在了心里。' }
    ]
  },
  {
    id: 'juanguan',
    who: { emoji: '🧧', name: '豪商管家', tag: '登门求见' },
    text: '「我家老爷说，犬子愚钝，科举无望，听说朝廷开捐纳……」管家捧着一万两银票，「只求大人指条明路。」',
    options: [
      { label: '收银子，指条明路', effects: { jc: 16, mw: -8, zj: -2 }, result: '银子入库，文书上路。你叮嘱自己：下不为例。' },
      { label: '拒绝', effects: { mw: 6 }, result: '管家悻悻而去，临走丢下一句：「京官清贵，果然清贵。」' },
      { label: '劝其捐给义学', effects: { mw: 4, zj: 2, jc: 4 }, result: '他犹豫再三，把钱捐了一半——给你的「程仪」也加了一半。' }
    ]
  },
  {
    id: 'jiemei',
    who: { emoji: '🍶', name: '同年周编修', tag: '密会' },
    text: '同年深夜来访：「听说考功司对你颇为看重。你我同年之谊……」袖口露出一双玉如意。',
    options: [
      { label: '应下，寻机美言', effects: { mw: 4, jc: 6, sj: -4 }, result: '你在堂上替他圆了两句话。话不多，分量不轻。' },
      { label: '收礼不办事', effects: { jc: 8, mw: -6 }, result: '玉如意收了，话没递。他后来知道了，恨得牙痒。' },
      { label: '正色拒绝', effects: { sj: 2, mw: 4 }, result: '「取士以德，美言害你。」他拂袖而去，半年后又提着酒来谢你。' }
    ]
  },
  {
    id: 'zhixiong',
    who: { emoji: '👴', name: '族中叔父', tag: '家书' },
    text: '族中叔父来信：你侄儿在乡里强占田亩、殴伤佃户，苦主已告到县衙。「一笔写不出两个姓，你看着办。」',
    options: [
      { label: '修书县令，依法严办', effects: { mw: 12, zj: 4 }, result: '侄儿进了班房，族里骂你六亲不认，乡人却给你立了长生牌位。' },
      { label: '寄银子回去私了', effects: { jc: -8, mw: -6 }, result: '苦主撤了状。秋后，侄儿又占了一片新田。' },
      { label: '装作不知', effects: { mw: -8 }, result: '家乡的事，传得比你想的快得多。' }
    ]
  },
  {
    id: 'yinbu',
    who: { emoji: '👴', name: '族老', tag: '亲自进京' },
    text: '族老拄着拐进京：「你如今做官，族里孩子也该有个出身。荫补的名额就一个，你安排安排？」',
    options: [
      { label: '断然拒绝', effects: { mw: 6, sj: 2 }, result: '「仕途取之有道。」族老骂骂咧咧回了乡，逢人却说你是好孩子。' },
      { label: '安排个远房闲职', effects: { mw: -6, jc: 6, sj: -4 }, result: '名单递上去时你犹豫了一下——还是递了。' },
      { label: '出私财供子弟读书', effects: { jc: -10, mw: 8 }, result: '三年后族里真出了个秀才，中堂挂着你写的对联。' }
    ]
  },
  {
    id: 'shishe',
    who: { emoji: '🍶', name: '翰林同僚', tag: '诗社之邀' },
    text: '几位同僚发起诗社，每月一聚，饮宴唱和。你隐约觉得，他们看你的眼神像在拉人入伙。',
    options: [
      { label: '加入', effects: { mw: 8, sj: -6 }, result: '诗社唱和确是雅事。只是每期刻本，都会有一份被送进宫里。' },
      { label: '婉拒', effects: { sj: 6, mw: -4 }, result: '「臣工结社，恐惹物议。」你在心里默念了一遍，回帖写得客客气气。' },
      { label: '只赴一次，不挂名', effects: { mw: 2, sj: 2 }, result: '去了一次，诗写得敷衍，酒喝得尽兴。' }
    ]
  },
  {
    id: 'tanha',
    who: { emoji: '🗡️', name: '都察院御史', tag: '当廷弹劾', minYear: 2 },
    text: '御史当廷弹劾你的好友周编修「结交内侍」。散朝后，所有人都在看你怎么表态。',
    options: [
      { label: '附议落井下石', effects: { sj: 4, mw: -8 }, result: '周编修罢官南归，路过你家门时，轿子没有停。' },
      { label: '出列为其剖白', effects: { mw: 8, sj: -6 }, result: '你把身家性命押上去说了一炷香的话。皇帝最后只说了三个字：「知道了。」' },
      { label: '称病早退', effects: { mw: -4 }, result: '你躲过了廷议，躲不过夜里那盏灯。' }
    ]
  },
  {
    id: 'zhengdi',
    who: { emoji: '🎓', name: '内阁首辅', tag: '廷议交锋' },
    text: '廷议漕粮改折，你方陈毕，首辅淡淡开口：「纸上谈兵，何异赵括？」满殿目光钉在你身上。',
    options: [
      { label: '据理力争，逐条驳斥', effects: { zj: 8, sj: 4, mw: 4 }, result: '你引数据、算明细，驳得殿上鸦雀无声。首辅最后只说了一个字：「准。」' },
      { label: '请陛下圣裁', effects: { sj: -2 }, result: '皇帝和了稀泥，方案改得面目全非。' },
      { label: '散朝后登门求教', effects: { jc: -10, mw: 4, sj: 2 }, result: '你提着礼登首辅的门。他笑纳了礼，也笑了话：「孺子可教。」' }
    ]
  },
  {
    id: 'pinfang',
    who: { emoji: '❄️', name: '老管家', tag: '雪夜', cond: (s) => s.jc < 70 },
    text: '大雪三日，城南贫户塌了十几间。老管家欲言又止：「老爷，库房里……还有多少活动银子？」',
    options: [
      { label: '开私库赈济', effects: { jc: -12, mw: 12, zj: 4 }, result: '你带着家丁在雪里搭棚施粥。开春后，城南百姓送来一把万民伞。' },
      { label: '上奏请朝廷赈济', effects: { zj: 6 }, result: '户部拨银二十万两——三个月之后。' },
      { label: '岁末用度紧张，爱莫能助', effects: { mw: -8 }, result: '大年初一，府门口的春联被人撕去了一条。' }
    ]
  },
  {
    id: 'jiaji',
    who: { emoji: '🏠', name: '老管家', tag: '账房', cond: (s) => s.jc < 40 },
    text: '「老爷，账上……撑不到月底了。」老管家的算盘打得比哭还难听，「俸银还差二十天才发。」',
    options: [
      { label: '遣散一半仆役', effects: { jc: 10, mw: -4 }, result: '老仆走时不肯要遣散钱，你让账房硬塞给了他。' },
      { label: '变卖夫人的嫁妆', effects: { jc: 12, mw: -8 }, result: '当铺朝奉压价压得狠，夫人的镯子只当了三成价。她说不心疼，你听得出来。' },
      { label: '典当自己的藏书', effects: { jc: 8, mw: 4 }, result: '「书是身外之物。」你这样安慰自己。好在只典当，不卖绝。' }
    ]
  },
  {
    id: 'muxin',
    who: { emoji: '🧓', name: '家书', tag: '八百里加急', minYear: 3 },
    text: '家书加急：母亲病重，郎中摇头。「忠孝不能两全」六个字，你写得出，做不到。',
    options: [
      { label: '告假侍疾三月', effects: { sj: -8, mw: 8 }, result: '皇帝准了假，朱批「忠孝本一体」。母亲见了你，病先好了三分。' },
      { label: '重金请名医南下', effects: { jc: -12, mw: 4 }, result: '名医的方子灵，你三年的俸银没了。' },
      { label: '寄药寄银，公务为重', effects: { sj: 4, mw: -6 }, result: '家里回信说母亲痊愈了。那封信，你读了很多遍。' }
    ]
  },
  {
    id: 'mensheng',
    who: { emoji: '📖', name: '外任门生', tag: '述职回京', minYear: 2 },
    text: '门生放了外任，回京述职，抬来两坛「家乡土产」。坛口的封泥下面，隐约是银光。',
    options: [
      { label: '心领神会，收下', effects: { jc: 12, mw: -4 }, result: '土产很重，情谊很沉。' },
      { label: '当场启封验看，退回', effects: { mw: 8 }, result: '门生红着脸抬走了银子，逢人却说：吾师真君子。' },
      { label: '收一坛，退一坛', effects: { jc: 6, mw: 2 }, result: '你留下了那坛真的土产——里面是腌笋，很下饭。' }
    ]
  },
  {
    id: 'baozang',
    who: { emoji: '💰', name: '老管家', tag: '修宅惊变' },
    text: '修葺宅院，工匠从墙夹层里挖出前朝官银一箱，锈迹斑驳，约五千两。',
    options: [
      { label: '全数上缴朝廷', effects: { sj: 8, mw: 8 }, result: '皇帝御笔题了「彰善」二字。清流赞你拾金不昧——其实你也肉疼了一晚上。' },
      { label: '悄悄收下', effects: { jc: 20, mw: -6 }, result: '夜深人静，你亲自把银子搬进了地窖。' },
      { label: '捐一半给粥厂，留一半', effects: { jc: 8, mw: 6, sj: 2 }, result: '粥厂立了功德碑，地窖满了一层。' }
    ]
  },
  {
    id: 'gongshi',
    who: { emoji: '🕯️', name: '掌印太监曹公公', tag: '深夜到访' },
    text: '内库失窃了三件御用器物。曹公公亲自登门：「这事儿您经手过内库……帮咱家遮一遮？」',
    options: [
      { label: '帮他遮掩', effects: { jc: 12, sj: 4, mw: -6 }, result: '事情压下去了。曹公公从此对你格外客气——宫里的消息也灵通了。' },
      { label: '奏明圣上，彻查', effects: { zj: 6, mw: 6, sj: -4 }, result: '查出来的东西不多，得罪的人不少。' },
      { label: '装糊涂', effects: { mw: 2 }, result: '「本官只读过圣贤书，没见过内库的门朝哪边开。」曹公公笑了。' }
    ]
  },
  {
    id: 'fangong',
    who: { emoji: '📜', name: '礼部尚书', tag: '会同验贡' },
    text: '琉球贡使献上夜明珠一斛、龙涎香十斤。礼部尚书问你：「例贡之外多出来的部分，怎么登记？」',
    options: [
      { label: '全数入官', effects: { sj: 6, zj: 4 }, result: '账目干净。皇帝御览贡单时，在你署名的地方多看了一眼。' },
      {
        label: '截留一斛夜明珠',
        effects: { jc: 14 },
        result: '夜明珠温润生光，你把它们藏进了书房的地砖下面。',
        risk: { chance: 0.35, effects: { jc: 0, sj: -10, mw: -4 }, result: '内库对账那天，少掉的那斛珠子成了悬案——悬在你头上。' }
      },
      { label: '分赠同僚', effects: { mw: 8, jc: -2 }, result: '「见者有份。」礼部上下都念你的好。' }
    ]
  },
  {
    id: 'chidao',
    who: { emoji: '⏰', name: '大朝会', tag: '午门外', weight: 0.5 },
    text: '大朝会，你寅时三刻才冲进午门，朝班里响起一片压低的吸气声。皇帝的眼神扫了过来。',
    options: [
      { label: '免冠请罪', effects: { sj: -4 }, result: '皇帝「嗯」了一声，算是揭过。' },
      { label: '编个坠马受伤的由头', effects: { sj: -8, mw: -2 }, result: '皇帝关切地让你「站着受用」。散朝后，太医院来给你验伤了。' },
      { label: '直言昨夜批卷到三更', effects: { sj: 2, zj: 2, mw: 2 }, result: '皇帝沉吟片刻：「以后早些睡。」朝班里有人偷偷笑了。' }
    ]
  },
  {
    id: 'huaben',
    who: { emoji: '📖', name: '书坊主人', tag: '登门拜访' },
    text: '「满城都在传《宦海惊涛》，那位判案如神、朝堂斗奸的大人——用的就是您的名讳！」书坊主搓着手，「续集，想请您掌掌眼？」',
    options: [
      { label: '严令禁毁', effects: { mw: -6 }, result: '禁令一下，盗版反而更多了。' },
      { label: '任其流传', effects: { mw: 6, sj: -2 }, result: '满城传阅，连宫里的太监都在讲书里的桥段。' },
      { label: '亲笔题个书名', effects: { mw: 8, sj: -4, jc: 6 }, result: '书商奉上润笔百两。某日皇帝幽幽地问：「爱卿的书法，近来多了些烟火气。」' }
    ]
  },
  {
    id: 'wanshou',
    who: { emoji: '📜', name: '礼部主事', tag: '万寿节', minYear: 2 },
    text: '皇帝万寿将至，百官上表称贺。幕僚问：「贺表您写骈俪颂圣，还是……写点别的？」',
    options: [
      { label: '极尽颂圣之能事', effects: { sj: 8, mw: -4 }, result: '贺表词藻华美，皇帝朱批一个好字。' },
      { label: '颂中带谏，直陈三弊', effects: { sj: -6, mw: 8, zj: 4 }, result: '皇帝看完沉默半晌：「贺表里夹骨头，满朝只有你敢。」' },
      { label: '走个流程', effects: { sj: -2 }, result: '你的贺表，排在第两百一十七份。' }
    ]
  },
  {
    id: 'dangzheng',
    who: { emoji: '🎓', name: '内阁首辅', tag: '递话', minRank: 5 },
    text: '首辅与次辅斗得如火如荼，两边都派人来递话：首辅许你入阁，次辅许你尚书——都要你「表个态」。',
    options: [
      { label: '投首辅', effects: { sj: 6, mw: -4, zj: 4 }, result: '你押对了——这一次。' },
      { label: '投次辅', effects: { sj: -4, mw: 4, zj: 2 }, result: '次辅势力渐长，你的处境也渐微妙。' },
      { label: '两不相帮，只做事', effects: { sj: -6, mw: 8, zj: 6 }, result: '两边都骂你「首鼠两端」，两边也都不敢小看你。' }
    ]
  },
  {
    id: 'jiushi',
    who: { emoji: '🗡️', name: '皇帝密谕', tag: '旧案卷宗', minYear: 8 },
    text: '皇帝密令你主审一桩先朝旧案。案卷翻开第一页，名字刺得你眼睛生疼——是当年提携你的恩师。',
    options: [
      { label: '秉公直书', effects: { sj: 8, zj: 8, mw: 4 }, result: '恩师罢官流放，临行只留一句：「不冤。」你把这二字裱了起来。' },
      { label: '曲笔回护', effects: { mw: -8, sj: -6, jc: -4 }, result: '案子办成了悬案。言官的弹章里，你的名字出现了七次。' },
      { label: '称病辞差', effects: { sj: -8, mw: 2 }, result: '你躲开了案子，没躲开夜里的问题。' }
    ]
  }
]
