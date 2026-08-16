// 皇帝模拟器 · 事件池
// 每个事件是一份呈到御前的奏折或突发大事，选项 effects 影响五维：
// treasury 国库（万两）、people 民心、army 军力、court 朝纲、health 健康
// weight 可为数字或 (s) => 数字（s 为当前局面快照），cond 不满足则不入池

export const emperorEvents = [
  // ── 民生 ──────────────────────────────────────────────
  {
    id: 'flood-jiangnan',
    tag: '民生',
    title: '江南水患',
    from: '两江总督 · 六百里加急',
    text: '连月暴雨，江堤决口，淹没农田三十万亩，灾民流离失所，哀鸿遍野。督臣叩请朝廷速拨赈银，以安民心。',
    weight: 10,
    options: [
      {
        label: '拨银三百万两赈灾',
        effects: { treasury: -300, people: 12 },
        result: '赈银火速南下，粥厂遍设，灾民得活。江南百姓感念皇恩，家家供奉长生牌位。'
      },
      {
        label: '令地方自筹救济',
        effects: { people: -10, court: -4 },
        result: '地方官吏挪挤军费仓谷应付，赈济敷衍了事，民间怨声渐起，言官亦交章弹劾。'
      },
      {
        label: '以工代赈，灾民修堤',
        effects: { treasury: -150, people: 6, court: 3 },
        result: '灾民领钱粮修堤，既活人又固堤，来年水患可减。户部称许此法一举两得。'
      }
    ]
  },
  {
    id: 'drought-north',
    tag: '民生',
    title: '北方大旱',
    from: '河南巡抚 · 奏',
    text: '中原数月无雨，赤地千里，麦苗尽枯，斗米涨至百钱。饥民聚于城隍庙祈雨，人心惶惶。',
    weight: 9,
    options: [
      {
        label: '减免钱粮，下诏祈雨',
        effects: { treasury: -100, people: 9 },
        result: '诏书一下，全免灾区钱粮。百姓闻诏泣拜于道，虽天灾无情，人心反固。'
      },
      {
        label: '开常平仓放粮',
        effects: { treasury: -200, people: 14, army: -2 },
        result: '仓粮平价放售，米价应声而落。只是漕粮储备为之一空，兵部颇有微词。'
      },
      {
        label: '天行有常，不予理会',
        effects: { people: -15 },
        result: '朝廷未发一粮。饥民剥树皮、掘草根而食，道殣相望，中原隐隐有流民聚众之象。'
      }
    ]
  },
  {
    id: 'locust-plague',
    tag: '民生',
    title: '蝗灾过境',
    from: '山东布政使 · 奏',
    text: '飞蝗蔽日，所过之处禾穗一空。民间传蝗乃「神虫」，不敢捕杀，唯焚香设坛而已。',
    weight: 8,
    options: [
      {
        label: '晓谕百姓，捕蝗换粮',
        effects: { treasury: -120, people: 10 },
        result: '官府以粟易蝗，百姓踊跃扑打，蝗祸大减。民始知蝗可捕而不可拜。'
      },
      {
        label: '遣官设坛祭虫王',
        effects: { treasury: -40, people: -5, court: -4 },
        result: '祭坛耗银而无功，蝗虫依旧蔽日。有翰林私下作诗讥「泥龙拜罢拜纸蝗」。'
      },
      {
        label: '劝民改种荞麦补种',
        effects: { treasury: -60, people: 5 },
        result: '农时已失大半，荞麦薄收，尚可糊口。老农皆言皇上记得庄稼，是社稷之福。'
      }
    ]
  },
  {
    id: 'plague-outbreak',
    tag: '民生',
    title: '瘟疫流行',
    from: '顺天府尹 · 奏',
    text: '京师入夏疫气大作，一巷数十家俱病，棺槥一空。太医院方士各执一词，民心大恐。',
    weight: 7,
    options: [
      {
        label: '命太医院遍设药局',
        effects: { treasury: -180, people: 12 },
        result: '药局施药月余，疫势渐衰。京师百姓称颂圣德，画《施药图》以记其事。'
      },
      {
        label: '封锁疫区，隔绝往来',
        effects: { people: -7, court: 5 },
        result: '疫区栅门紧闭，疫情未再蔓延。只是区内百姓断了生计，哭声夜夜闻于宫墙。'
      },
      {
        label: '听天由命',
        effects: { people: -16 },
        result: '疫气蔓延三月方歇，京畿殁者以万计。民间私议：朝廷有司，形同虚设。'
      }
    ]
  },
  {
    id: 'caoyu-silted',
    tag: '民生',
    title: '漕运淤塞',
    from: '漕运总督 · 奏',
    text: '运河多处浅涸，漕船千艘搁浅于途，江南漕米难以北运，京师存粮仅支三月。',
    weight: 8,
    options: [
      {
        label: '拨款大举疏浚河道',
        effects: { treasury: -220, people: 7, court: 4 },
        result: '河道疏浚一新，漕船衔尾北上，京仓渐盈。漕丁亦得工钱，沿河州县俱受其惠。'
      },
      {
        label: '暂改海运试行之',
        effects: { treasury: -80, people: 2, court: -3 },
        result: '海船风浪无情，沉了两艘，朝中旧臣痛心疾首，直呼祖宗之法不可变，纷争不休。'
      },
      {
        label: '挤牙缝，缓缓修来',
        effects: { treasury: -30, people: -5, court: 2 },
        result: '零敲碎打修了一年，漕粮勉强够用。只是米价悄悄涨了三成，市井啧有烦言。'
      }
    ]
  },
  {
    id: 'salt-price',
    tag: '民生',
    title: '盐价飞涨',
    from: '都察院 · 御史联名奏',
    text: '盐商囤积居奇，盐价一月三涨，贫家有淡食半月者。御史请朝廷严惩奸商，平抑盐价。',
    weight: 7,
    options: [
      {
        label: '开官盐仓平价发售',
        effects: { treasury: -100, people: 9 },
        result: '官盐一出，盐价应声而落。百姓排队长龙达于街尾，人人称便。'
      },
      {
        label: '严打私盐，缉捕盐枭',
        effects: { people: -4, court: 6, treasury: 50 },
        result: '盐枭或擒或散，盐税入库倍增。只是贫民赖私盐为生者众多，私下怨望。'
      },
      {
        label: '市场自调，不必干预',
        effects: { people: -10 },
        result: '盐价又涨两月方回落。这年冬天，「淡食」成了穷人家待客的体面话。'
      }
    ]
  },
  {
    id: 'refugees-capital',
    tag: '民生',
    title: '流民聚集京师',
    from: '五城兵马司 · 禀',
    text: '各地流民扶老携幼涌入京师，露宿城门洞下者数以千计，昼则行乞，夜则冻馁。',
    weight: 8,
    options: [
      {
        label: '设粥厂安置，资送回籍',
        effects: { treasury: -150, people: 11 },
        result: '粥厂月余，流民得食得归。天下皆言京师有活人之政，四方颂声大起。'
      },
      {
        label: '驱散出城，各回原籍',
        effects: { people: -12, court: 2 },
        result: '兵丁驱赶之下，流民哭号出城，冻毙于道者有之。城外白骨，御史笔笔皆记。'
      },
      {
        label: '择精壮编入营伍',
        effects: { treasury: -40, people: -4, army: 7 },
        result: '流民精壮者投军得饷，老弱仍流落。兵部喜得兵源，礼部叹人不聊生。'
      }
    ]
  },
  {
    id: 'irrigation-works',
    tag: '民生',
    title: '兴修水利之议',
    from: '工部 · 尚书奏',
    text: '工部条陈：若于豫东开渠引水、修闸蓄涝，可增水田百万亩，然需银甚巨，工期三年。',
    weight: 7,
    options: [
      {
        label: '准奏，克日兴工',
        effects: { treasury: -260, people: 14 },
        result: '渠成之日，旱田变水田，亩产倍增。百姓立生祠祀之，号为「皇上渠」。'
      },
      {
        label: '国用浩繁，暂缓议行',
        effects: { people: -5, court: 2 },
        result: '图纸束之高阁。地方官叹息：又是一个「再议」，不知议到何年何月。'
      },
      {
        label: '令富户捐输助工',
        effects: { treasury: -80, people: 4, court: -3 },
        result: '富户勉强捐银，暗地里串通压佃户租子找补。工程半成，功过参半。'
      }
    ]
  },
  {
    id: 'grain-corner',
    tag: '民生',
    title: '豪强囤粮',
    from: '顺天府丞 · 密奏',
    text: '京畿数家豪强粮仓相连，囤米数十万石，坐待价高。米价旬日一涨，民不聊生。',
    weight: 7,
    options: [
      {
        label: '遣官查仓，限价令售',
        effects: { people: 9, court: -4 },
        result: '兵丁封仓验米，豪强被迫平价出粜。米价立落，只是缙绅圈内骂声不绝。'
      },
      {
        label: '动常平仓放粮对冲',
        effects: { treasury: -120, people: 7 },
        result: '官粮源源放出，豪强囤粮砸在手里，米价回到常轨。户部肉痛，百姓欢呼。'
      },
      {
        label: '买卖自负，勿再多事',
        effects: { people: -11, treasury: 30 },
        result: '来年豪强「孝敬」如约而至。只是这年冬天，城中冻饿而死者，比往年多了许多。'
      }
    ]
  },
  {
    id: 'granary-empty',
    tag: '民生',
    title: '义仓亏空',
    from: '户部 · 侍郎自劾奏',
    text: '清查各省义仓，存粮账面颇丰，实仓十仅三四，历任官员挪借亏空，积重难返。',
    weight: 6,
    options: [
      {
        label: '限期追赔，填补仓储',
        effects: { treasury: 120, court: 5, people: 3 },
        result: '亏空官员变产赔补，仓廪渐实。官场为之一凛，皆言新君不好糊弄。'
      },
      {
        label: '既往不咎，逐年补足',
        effects: { treasury: -100, people: 4, court: -5 },
        result: '宽典虽安了官心，亏空者却观望拖延，义仓补了个寂寞。'
      },
      {
        label: '严查到底，一追到顶',
        effects: { court: 8, treasury: 60, people: 5, health: -4 },
        result: '一案连坐数十官，牵出京城无数说情条子。皇上批折至三更，肉眼可见地清减了。'
      }
    ]
  },

  // ── 朝堂 ──────────────────────────────────────────────
  {
    id: 'remonstrance',
    tag: '朝堂',
    title: '言官直谏',
    from: '监察御史 · 上疏',
    text: '御史疏奏，词气峻切，直指「近岁宫中用度渐侈，政事多有拖沓」，请皇上「亲贤远佞，俯纳刍荛」。',
    weight: 10,
    options: [
      {
        label: '虚心嘉纳，宣付史馆',
        effects: { court: 8, people: 4 },
        result: '直臣受赏，言路为之一开。朝野皆称天子雅量，敢言之风大盛。'
      },
      {
        label: '贬往云南驿充当差',
        effects: { court: -6, people: -4 },
        result: '御史束装就道，一路吟诗骂声不绝。自此奏折里的「臣不胜惶恐」越来越多，真话越来越少。'
      },
      {
        label: '廷杖三十以惩狂悖',
        effects: { court: -11 },
        result: '午门外血溅青砖。百官垂首屏息，朝会上再无人敢多看皇上一眼。'
      }
    ]
  },
  {
    id: 'powerful-minister',
    tag: '朝堂',
    title: '权臣坐大',
    from: '密折 · 署名「知情人」',
    text: '首辅门生故吏遍布要津，六部奏事先递相府阅过方才面圣。都中传言：「只知有相，不知有帝。」',
    weight: 8,
    options: [
      {
        label: '明升暗降，收其权柄',
        effects: { court: 9, army: -3 },
        result: '加太师衔、罢直阁务的诏书同日而下，权臣只得叩谢「皇恩」。帝党渐掌中枢。'
      },
      {
        label: '隐忍不发，静待其变',
        effects: { court: -7 },
        result: '相府车马依旧盈门。皇上夜里翻来覆去：再忍忍，再忍忍……'
      },
      {
        label: '宫中赐宴，杯酒释兵权',
        effects: { treasury: -60, court: 6, people: 2 },
        result: '一场酒喝到三更，次日权臣上表「乞骸骨」。君臣体面俱在，朝局悄然翻覆。'
      }
    ]
  },
  {
    id: 'imperial-exam',
    tag: '朝堂',
    title: '科举之议',
    from: '礼部 · 奏',
    text: '礼部请示来年是否开科取士。天下举子翘首，书院山长联名上书，盼朝廷早定考期。',
    weight: 8,
    options: [
      {
        label: '增开恩科，广纳英才',
        effects: { treasury: -90, court: 8, people: 3 },
        result: '恩科一出，天下士子摩肩接踵入京。金榜题名者焚香谢恩，皆言圣朝气象。'
      },
      {
        label: '三年一科，循例而行',
        effects: {},
        result: '一切照旧。举子们收起行囊，继续挑灯苦读，等待下个三年。'
      },
      {
        label: '科举废虚文，改察举',
        effects: { court: -12, people: -3 },
        result: '诏令一下，天下哗然。读书人断了几百年的一条大道，骂声与请愿雪片般飞来。'
      }
    ]
  },
  {
    id: 'exam-fraud',
    tag: '朝堂',
    title: '会试舞弊案',
    from: '落第举子 · 聚众叩阍',
    text: '数百落第举子跪于宫门，头顶考卷高呼「取士不公」。传闻有考官鬻题卖榜，关节条子满天飞。',
    weight: 7,
    options: [
      {
        label: '钦差严查，一查到底',
        effects: { treasury: -50, court: 10, people: -3 },
        result: '主考官裙带、卖题、换卷诸事俱发，一串官员摘印下狱。士林震悚，考风为之一肃。'
      },
      {
        label: '大事化小，补录数人',
        effects: { court: -8 },
        result: '补录了几个闹得最凶的，举子们散了。只是「闹而优则仕」从此成了京城新典故。'
      },
      {
        label: '本届作废，来年重考',
        effects: { treasury: -110, court: 6, people: 2 },
        result: '重考之日，糊名誊录加倍严格。天下读书人议论：这回朝廷是动真格了。'
      }
    ]
  },
  {
    id: 'faction-strife',
    tag: '朝堂',
    title: '两党相争',
    from: '内阁 · 票拟',
    text: '朝中南北两党因河工人事互相攻讦，各自递上名单，皆请将对方干员尽数外放。政事为之拖延。',
    weight: 7,
    options: [
      {
        label: '各打五十大板',
        effects: { court: 4 },
        result: '两党领头各罚俸一年，所用名单一概不准。阁臣们讪讪而退，政务照常运转。'
      },
      {
        label: '支持北党打压南党',
        effects: { court: -3, army: 3 },
        result: '北党得势，河工军需诸事推行雷厉风行。南籍官员纷纷告病，衙门空了一半。'
      },
      {
        label: '亲自一一面试定夺',
        effects: { court: 6, health: -5 },
        result: '连续半月召对至深夜，皇上瘦了一圈，却把两党干员摸了个门儿清。'
      }
    ]
  },
  {
    id: 'official-review',
    tag: '朝堂',
    title: '京察大计',
    from: '吏部 · 奏',
    text: '三年考绩之期已至，吏部拟对京官大计。名单中碌碌者众，而有能吏因「性刚」被注「浮躁」。',
    weight: 7,
    options: [
      {
        label: '亲阅考语，擢能黜庸',
        effects: { treasury: -40, court: 9, people: 3 },
        result: '「性刚」能吏连升三级，老好人体面致仕。官场风气为之一变。'
      },
      {
        label: '如吏部所拟',
        effects: { court: -6 },
        result: '考语照准。能吏寒心，庸才弹冠相庆，都中传言：会做事不如会做人。'
      },
      {
        label: '今年从宽，既往不咎',
        effects: { court: -3, treasury: 20 },
        result: '从宽之处，官员们的「孝敬」也从宽了。吏部考功司的墨都磨得比往年费。'
      }
    ]
  },
  {
    id: 'general-amnesty',
    tag: '朝堂',
    title: '请行大赦',
    from: '刑部 · 会同内阁奏',
    text: '值此改元伊始，刑部会同内阁上疏，请大赦天下，以彰圣朝仁德。死囚中亦有情有可原者。',
    weight: 6,
    options: [
      {
        label: '准奏，大赦天下',
        effects: { treasury: -30, people: 12, court: -4 },
        result: '诏书颁行，囹圄一空。百姓称颂圣德，只是几名刚拿住的江洋大盗也夹在赦单里出了狱。'
      },
      {
        label: '除死罪外皆赦',
        effects: { people: 6, court: 2 },
        result: '恩威并施的死罪不赦条款，令刑名官员交口称善：这一版赦书，成色十足。'
      },
      {
        label: '不准，法度不可玩',
        effects: { court: 4, people: -4 },
        result: '赦议作罢。市井间少了一场狂欢，法司衙门却念了声「阿弥陀佛」。'
      }
    ]
  },
  {
    id: 'death-row-review',
    tag: '朝堂',
    title: '秋审勾决',
    from: '刑部 · 进呈黄册',
    text: '秋审黄册呈御览，勾决与否，朱笔在皇上。册中人命数十，其中有逼于饥寒而杀人越货者。',
    weight: 7,
    options: [
      {
        label: '逐一亲阅，矜疑者免勾',
        effects: { people: 7, health: -3 },
        result: '烛下朱笔圈了三日，「情有可原」者改斩监候。刑部老吏感叹：数十年未见如此勾决。'
      },
      {
        label: '如刑部所拟，尽数勾决',
        effects: { court: 3 },
        result: '朱笔一路勾到底。刑场旌旗肃肃，观者如堵，法度森然。'
      },
      {
        label: '重罪者改流边充军',
        effects: { people: 4, army: 3, court: -2 },
        result: '数十死囚改发边地充军，戴罪戍边。边将得了生力军，死囚家属在城郊磕头谢恩。'
      }
    ]
  },
  {
    id: 'corrupt-official',
    tag: '朝堂',
    title: '弹劾巨贪',
    from: '都察院 · 密疏',
    text: '御史密奏：某省藩台在任八年，卖缺受贿，家资巨万，其府中「伺候规矩」竟比王府还大。',
    weight: 8,
    options: [
      {
        label: '即刻抄家拿问',
        effects: { treasury: 250, court: 6, people: -3 },
        result: '抄出现银百万、田契两大箱。国库进账，官场胆寒，民间却有「官逼民反抄官家」的歌谣。'
      },
      {
        label: '证据不足，从缓办理',
        effects: { court: -5 },
        result: '密疏留中。数月后该藩台「病乞致仕」，携家眷细软浩浩荡荡回了原籍。'
      },
      {
        label: '交三司会审，依律而定',
        effects: { treasury: 80, court: 5, people: 2 },
        result: '三司会审三月，铁证如山。菜市口观刑者万人空巷，皆言朝廷还有王法。'
      }
    ]
  },
  {
    id: 'auspicious-omen',
    tag: '朝堂',
    title: '祥瑞迭出',
    from: '礼部 · 汇奏',
    text: '各省报来祥瑞：麦生九穗、白鹿现身、枯井复涌……礼部请昭告天下，宣付史馆，以彰圣德。',
    weight: 6,
    options: [
      {
        label: '昭告天下，举朝称贺',
        effects: { treasury: -30, court: 3, people: 2 },
        result: '祥瑞诏书贴遍州县。万民空巷观诏，至于麦到底几个穗，没人真去数。'
      },
      {
        label: '斥其虚妄，一概不许',
        effects: { court: 6 },
        result: '「麦秀两岐，岁岁有之，何瑞之有？」朱批一出，报祥瑞的折子立时绝迹。'
      },
      {
        label: '不置可否，留中不发',
        effects: { court: -2 },
        result: '折子留中。礼部摸不着头脑，只得传话下去：祥瑞……先缓缓再报。'
      }
    ]
  },
  {
    id: 'chengguo-notes',
    tag: '朝堂',
    title: '求观起居注',
    from: '御前 · 心腹太监密禀',
    text: '皇上前日朝会失仪被史官记了一笔。心腹太监悄声问：要不要想法子把起居注调来看看？',
    weight: 5,
    options: [
      {
        label: '史官直笔，朕亦不观',
        effects: { court: 9 },
        result: '一句话传遍史馆，起居注官落笔记下：「上曰：史官直笔，朕亦不观。」传为佳话。'
      },
      {
        label: '强索观之',
        effects: { court: -7 },
        result: '史官跪地死抱注册不放手，事情传扬出去，朝中议论了整整一个月。'
      },
      {
        label: '算了，不看也罢',
        effects: { court: 3 },
        result: '皇上悻悻摆手。夜里翻来覆去：那笔到底是怎么记的……'
      }
    ]
  },

  // ── 军事 ──────────────────────────────────────────────
  {
    id: 'northern-invasion',
    tag: '军事',
    title: '北虏犯边',
    from: '蓟辽总督 · 八百里加急',
    text: '北虏铁骑三万叩边，连破两堡，边民死伤枕藉。军情如火，请朝廷速定战守之策。',
    weight: 9,
    options: [
      {
        label: '御驾亲征',
        effects: { treasury: -180, army: 10, people: 5, health: -10 },
        result: '天子亲征，六军将士用命，虏骑远遁。凯旋之日，献俘阙下，军民山呼之声撼动九城。'
      },
      {
        label: '命大将率军驰援',
        effects: { treasury: -120, army: 6, people: 2 },
        result: '援军星夜出关，数战数捷。边关暂安，捷报与叙功名单一并抵京。'
      },
      {
        label: '遣使议和，岁币买安',
        effects: { treasury: -100, army: -8, people: -8, court: 3 },
        result: '岁币绸缎出塞，边烽暂熄。朝中主战派痛哭于朝：此例一开，后患无穷！'
      }
    ]
  },
  {
    id: 'general-requests-battle',
    tag: '军事',
    title: '将领请战',
    from: '边镇总兵 · 奏',
    text: '总兵奏称：虏部新败、部众离心，正是「痛打落水狗」之机，愿率精兵捣巢，一举永逸。',
    weight: 7,
    options: [
      {
        label: '准奏，粮饷从优',
        effects: { treasury: -140, army: 7 },
        result: '捣巢之战大获全胜，焚其老营而还。北边部落几十年不敢南望。'
      },
      {
        label: '持重为上，坚守不出',
        effects: { court: 3, army: -2 },
        result: '敕书诫以持重。总兵奉诏勒兵，只是登墙北望时，总是长吁短叹。'
      },
      {
        label: '临阵易将，另择老成',
        effects: { army: -5, court: 2 },
        result: '新将到镇，谨慎有余而锐气不足。军中旧部私下为老总兵抱屈。'
      }
    ]
  },
  {
    id: 'recruitment',
    tag: '军事',
    title: '兵额之议',
    from: '兵部 · 奏',
    text: '兵部条陈：如今营伍缺额、老弱充数，是汰弱补强、增饷募兵，还是索性裁汰节省？',
    weight: 7,
    options: [
      {
        label: '增饷募兵，汰弱补强',
        effects: { treasury: -200, army: 11 },
        result: '新兵入营，饷银给足，操练有声有色。边墙之上，气象一新。'
      },
      {
        label: '维持现状',
        effects: {},
        result: '一切照旧。营伍里白发兵和空名字继续同领一份饷，大家心照不宣。'
      },
      {
        label: '大举裁军以省饷',
        effects: { treasury: 180, army: -10, people: 3 },
        result: '刀切下来，兵额骤减三成。省下的银子入了国库，散伙的兵勇在市井游荡，隐患暗生。'
      }
    ]
  },
  {
    id: 'horse-admin',
    tag: '军事',
    title: '马政败坏',
    from: '太仆寺 · 卿奏',
    text: '官马倒毙过半，孳生不及，牧地多被豪强侵占。战马一匹难求，骑兵渐成步兵。',
    weight: 6,
    options: [
      {
        label: '清还牧地，整顿马政',
        effects: { treasury: -100, army: 8 },
        result: '牧地清丈归还，马政渐有起色。太仆寺卿逢人便讲：马是国之大畜，不可不察。'
      },
      {
        label: '开设茶马互市易马',
        effects: { treasury: -60, army: 5, people: 2 },
        result: '以茶易马，边地各部趋之若鹜。战马成群入塞，边市亦随之兴旺。'
      },
      {
        label: '暂缓整顿',
        effects: { army: -5 },
        result: '马政依旧烂着。操场上骑兵牵着的马，一匹比一匹瘦。'
      }
    ]
  },
  {
    id: 'unpaid-troops',
    tag: '军事',
    title: '军饷拖欠',
    from: '兵部 · 并各镇告急文',
    text: '各镇军饷积欠半年，士卒典衣卖刀度日，已有营头鼓噪索饷。兵部连夜奏请对策。',
    weight: 4,
    condition: (s) => s.treasury < 600,
    options: [
      {
        label: '动用内帑补发',
        effects: { treasury: -200, army: 9 },
        result: '内库银子抬出宫门，欠饷一日发清。将士感泣，山呼之声闻于大内。'
      },
      {
        label: '先发半月，余者缓图',
        effects: { treasury: -80, army: 2 },
        result: '半月饷银到手，鼓噪暂平。只是「余者缓图」四个字，兵丁们翻来覆去地念。'
      },
      {
        label: '令户部自行筹措',
        effects: { army: -9 },
        result: '户部两手一摊。各镇索饷的鼓噪声，一夜之间又起了三处。'
      }
    ]
  },
  {
    id: 'border-fortress',
    tag: '军事',
    title: '边墙筑城之议',
    from: '工部会同兵部 · 奏',
    text: '两家会奏：边墙多处倾颓，敌台不足。若大修边工，敌台相望、烽堠相连，虏骑难以长驱。',
    weight: 6,
    options: [
      {
        label: '准奏，拨银大修',
        effects: { treasury: -250, army: 8, court: 3 },
        result: '边工三年而成，墩台林立。北望边墙如龙，行旅感歌：「从此饮马不难，难在饮马江南。」'
      },
      {
        label: '拣紧要处修筑',
        effects: { treasury: -100, army: 4 },
        result: '紧要隘口优先修缮，其余将就。虏骑再来时，果然挑了没修的那段。'
      },
      {
        label: '暂缓，以抚代战',
        effects: { army: -4, treasury: -30 },
        result: '抚赏银发出，边墙依旧豁着口子。兵部尚书在私宅里叹气：银子花在墙上，总比花在贡桌上强。'
      }
    ]
  },
  {
    id: 'vassal-kings',
    tag: '军事',
    title: '藩王骄纵',
    from: '都察院 · 奏',
    text: '数位藩王在封地擅杀官吏、私征赋税、护卫逾制。有识者皆言尾大不掉，宜早图之。',
    weight: 7,
    options: [
      {
        label: '断然削藩',
        effects: { court: 9, army: -6 },
        result: '削藩诏下，多数藩王交出护卫，唯有一王举兵「清君侧」，天下为之骚动。'
      },
      {
        label: '加恩安抚，赐地赐金',
        effects: { treasury: -120, court: -4 },
        result: '赏赐源源出京，藩王们谢恩的表文写得花团锦簇，护卫一兵未减。'
      },
      {
        label: '召诸王入京荣养',
        effects: { treasury: -60, court: 5 },
        result: '诸王相继入京，居于戚里，锦衣玉食而无兵无地。叔父们在府里种花养鸟，倒也相安。'
      }
    ]
  },
  {
    id: 'pirates-coast',
    tag: '军事',
    title: '海寇袭扰',
    from: '闽浙总督 · 奏',
    text: '海寇连犯沿海州县，登岸焚掠，官兵追之则泛海而遁。绅民惶惶，请朝廷定海疆之策。',
    weight: 7,
    options: [
      {
        label: '增设水师，造船练兵',
        effects: { treasury: -190, army: 7 },
        result: '新式战船下水，水师渐成气候。海寇望帆而遁，沿海商路复通。'
      },
      {
        label: '迁界禁海，坚壁清野',
        effects: { people: -11, army: 4 },
        result: '沿海三十里内庐舍尽焚，居民内迁。海寇无从抢掠，沿海百姓也无家可归。'
      },
      {
        label: '遣使招抚，许其自新',
        effects: { treasury: 40, court: -3, army: 2 },
        result: '海寇头目受抚领了官职，横行如故，只是改叫「官船」了。'
      }
    ]
  },
  {
    id: 'firearms',
    tag: '军事',
    title: '火器新法',
    from: '兵仗局 · 会同传教士奏',
    text: '西洋教士献新式火炮图谱，称射程倍于旧制。兵仗局请拨银研造，以为军国利器。',
    weight: 6,
    options: [
      {
        label: '拨银依式仿造',
        effects: { treasury: -170, army: 9 },
        result: '新炮铸成，试放之日声震十里。靶场上的旧靶碎成齑粉，观操诸将动容。'
      },
      {
        label: '重金直接购于西洋',
        effects: { treasury: -220, army: 11, court: -2 },
        result: '西洋炮船抵港，炮械精良。朝中老臣痛心：「以重金购夷器，恐长他人志气。」'
      },
      {
        label: '弓马乃祖宗根本',
        effects: { army: -5, court: 3 },
        result: '图谱发还。教士怏怏而去，临行留话：火器之学，日新月异，可惜可惜。'
      }
    ]
  },
  {
    id: 'enemy-peace',
    tag: '军事',
    title: '敌国请和',
    from: '礼部 · 转呈国书',
    text: '邻国遣使奉表请和，愿结兄弟之国、互市贸易；然亦有朝臣指其「假和真缓」，不可轻信。',
    weight: 6,
    options: [
      {
        label: '许和通商，化干戈为玉帛',
        effects: { treasury: 80, people: 4, army: -3 },
        result: '两国盟书既定，边市贸易大盛。塞上的马奶酒与江南的丝绸，第一次摆在同一张桌上。'
      },
      {
        label: '拒和整军，以备大战',
        effects: { treasury: -150, army: 7 },
        result: '和议作罢，各军厉兵秣马。来岁果然大战一场，胜败之数，将士用命而已。'
      },
      {
        label: '虚与委蛇，以夷制夷',
        effects: { treasury: -30, court: -2, army: 2 },
        result: '一面应允和谈，一面暗联其邻国。使团往还如织，各国使馆的灯彻夜不熄。'
      }
    ]
  },

  // ── 宫廷 ──────────────────────────────────────────────
  {
    id: 'consort-selection',
    tag: '宫廷',
    title: '选秀之议',
    from: '内务府 · 请旨',
    text: '内务府例疏：中宫虚位已久，请循例选秀，以广嗣续。礼部已拟好采选章程，只候圣裁。',
    weight: 6,
    options: [
      {
        label: '循例选秀，充实后宫',
        effects: { treasury: -150, court: 3, health: 3 },
        result: '秀女入宫，钟鼓乐之。宫中添了些笑语，内务府的账上也添了长长一串开销。'
      },
      {
        label: '缩减规模，从简采选',
        effects: { treasury: -40, people: 3 },
        result: '缩减过半的采选名单发下，江南民间松了口气：今年自家的女儿能在家过年了。'
      },
      {
        label: '今年免选，以省民力',
        effects: { people: 6, court: -3 },
        result: '免选诏下，民间奔走相告。言官中却有牢骚：中宫久虚，终究于礼有亏。'
      }
    ]
  },
  {
    id: 'empress-advice',
    tag: '宫廷',
    title: '中宫劝俭',
    from: '皇后 · 手书',
    text: '皇后手书一封：「近见御膳日繁、进贡日巧，愿皇上念小民之艰难，崇俭去奢，则天下幸甚。」',
    weight: 5,
    options: [
      {
        label: '嘉纳之，减膳示俭',
        effects: { people: 6, health: 2 },
        result: '御膳减半，进贡裁汰。皇后亲率宫人纺纱，天下传为美谈。'
      },
      {
        label: '后宫不得干政，置之',
        effects: { court: -3 },
        result: '手书留于匣中。坤宁宫的灯，此后亮得一日比一日晚。'
      },
      {
        label: '反劝皇后安心治宫',
        effects: { treasury: -20 },
        result: '回赐珠翠一匣，附短简：「宫中事，卿自便。」皇后读罢，久久无言。'
      }
    ]
  },
  {
    id: 'heir-education',
    tag: '宫廷',
    title: '皇子的功课',
    from: '上书房 · 总师傅奏',
    text: '师傅奏：皇子近读《贞观政要》，问「水能载舟亦能覆舟」作何解。师傅称圣明，请皇上来日考校。',
    weight: 5,
    options: [
      {
        label: '亲往上书房考校',
        effects: { court: 5, health: -2 },
        result: '皇子对答如流，且言「愿百姓之水常清」。皇上拊掌大笑，赏《帝鉴图说》一部。'
      },
      {
        label: '严命师傅加倍督课',
        effects: { court: 4 },
        result: '皇子功课加了一倍，上书房的读书声传出宫墙。太监们私下嘀咕：小主子瘦了。'
      },
      {
        label: '皇子年幼，任其嬉戏',
        effects: { court: -4 },
        result: '上书房的窗子里，读书声渐稀，斗蛐蛐的罐子渐多。师傅摇头：储君之教，不可缓也。'
      }
    ]
  },
  {
    id: 'royal-kitchen',
    tag: '宫廷',
    title: '御膳房新膳',
    from: '御膳房 · 总管请旨',
    text: '膳房新到南边厨子，拟了一桌「时鲜宴」：糟鹅掌、蟹酿橙、莲房鱼包……请示是否呈上。',
    weight: 5,
    options: [
      {
        label: '呈上来尝尝',
        effects: { treasury: -30, health: 4 },
        result: '一桌时鲜吃得龙颜大悦，只是膳单传到外头，言官的折子已经在路上了。'
      },
      {
        label: '如常进膳',
        effects: {},
        result: '四菜一汤，如常进毕。御膳房总管把新菜单悄悄收进了抽屉。'
      },
      {
        label: '罢宴分赐当值侍卫',
        effects: { treasury: -5, people: 4 },
        result: '时鲜宴分赐当值侍卫。宫门内外传诵：万岁爷想着咱们当差的。'
      }
    ]
  },
  {
    id: 'palace-construction',
    tag: '宫廷',
    title: '营建宫殿之请',
    from: '工部 · 会内务府奏',
    text: '两家会奏：宫中西路殿宇年久渗漏，若趁机拓为「万寿宫」工苑，则崇丽壮观，足彰盛世。',
    weight: 6,
    options: [
      {
        label: '兴工营建',
        effects: { treasury: -400, court: 3, people: -9 },
        result: '万寿宫金碧一新，而「木料钱、工匠钱，羊毛出在羊身上」的歌谣也出了京。'
      },
      {
        label: '只修渗漏，不事扩建',
        effects: { treasury: -80, people: 4 },
        result: '补瓦勾缝，殿宇依旧。上梁那日，皇上亲书「惜民力」三字赐工部。'
      },
      {
        label: '暂缓一切宫工',
        effects: { people: 2, court: -2 },
        result: '宫工全停。雨天里，太监们端着盆在西路殿宇接漏，成为宫中一景。'
      }
    ]
  },
  {
    id: 'imperial-physician',
    tag: '宫廷',
    title: '太医请脉',
    from: '太医院 · 院使请旨',
    text: '太医院请脉，言皇上「操劳过度，肝火偏亢」，拟了温补方子，请旨静养些时日。',
    weight: 5,
    options: [
      {
        label: '依方进补，静养半月',
        effects: { treasury: -50, health: 8 },
        result: '半月静养，气色大为好转。只是积压的奏折也堆了半月，阁臣叫苦不迭。'
      },
      {
        label: '朝政要紧，照常理事',
        effects: { health: -6 },
        result: '药搁在案头凉了又热。批折到三更，眼前的字开始发花。'
      },
      {
        label: '试服方士金石之丹',
        effects: { health: -14 },
        result: '丹药入口燥热，当夜心悸汗出。太医院跪了一地，金丹被倒进了金水河。'
      }
    ]
  },
  {
    id: 'southern-tour',
    tag: '宫廷',
    title: '南巡之议',
    from: '内阁 · 票拟',
    text: '有大臣请皇上南巡，阅视河工、安抚江南；亦有大臣力谏：銮驾一出，州县供应如山，扰民甚重。',
    weight: 6,
    options: [
      {
        label: '銮驾南巡，阅视河工',
        effects: { treasury: -300, people: 6, court: 2 },
        result: '南巡三月，河工阅视、减免赋税、祭禹陵、访民瘼。御舟过处，两岸百姓山呼不绝。'
      },
      {
        label: '不劳民伤财，不去',
        effects: { people: 3 },
        result: '圣驾不出京，江南士民远设香案遥拜。折子里夹的「迎驾章程」原样退回。'
      },
      {
        label: '轻装简从，微服私访',
        effects: { treasury: -40, people: 4, health: 3 },
        result: '一叶扁舟、数名侍卫，看了真实的漕运、市集与河工。回宫后，几份奏折的朱批格外详细。'
      }
    ]
  },
  {
    id: 'imperial-birthday',
    tag: '宫廷',
    title: '万寿圣节',
    from: '礼部 · 奏',
    text: '圣节将至，礼部请示庆典规模。藩属使团已抵京候贺，各省督抚的贡单也厚薄不一。',
    weight: 5,
    options: [
      {
        label: '大典铺张，宣示国威',
        effects: { treasury: -200, court: 5, people: -4 },
        result: '万寿节庆典连开七日，灯火烛天。藩使咋舌，言官的折子也堆了一尺高。'
      },
      {
        label: '一切从简，不受贡品',
        effects: { people: 7, court: -3 },
        result: '不受贺、不进贡的诏书一出，天下称俭。各省督抚的贡车在半路调头。'
      },
      {
        label: '宴群臣而已',
        effects: { treasury: -60, court: 3 },
        result: '宫中赐宴一日，君臣赋诗为乐。饭菜品级照旧，气氛却颇为融洽。'
      }
    ]
  },
  {
    id: 'alchemist',
    tag: '宫廷',
    title: '术士献长生方',
    from: '通政司 · 转呈',
    text: '有方士叩阙，自称三百岁，献「九转金丹」一炉，称服之可「长生久视，寿与天齐」。',
    weight: 5,
    options: [
      {
        label: '斥退妖人',
        effects: { court: 5 },
        result: '方士逐出京师，金丹充公验看——太医院化验半日：铅汞之物，服之立仆。'
      },
      {
        label: '且试服之',
        effects: { health: -18 },
        result: '金丹服下当夜，腹痛如绞、冷汗如雨。太医院抢救三日，方士已在天牢里「长生」了。'
      },
      {
        label: '收而不服，留观其效',
        effects: { treasury: -20 },
        result: '金丹封存于匣。方士在京中住下，每日游山玩水，似乎一点都不着急。'
      }
    ]
  },

  // ── 灾异 ──────────────────────────────────────────────
  {
    id: 'comet-omen',
    tag: '灾异',
    title: '彗星见于东方',
    from: '钦天监 · 监正跪奏',
    text: '彗星现于东方，尾扫紫微。钦天监惶恐奏称「天象示警，恐政有阙失」，中外汹汹，皆言不祥。',
    weight: 6,
    options: [
      {
        label: '下诏罪己，修省政事',
        effects: { people: 8, court: 5 },
        result: '罪己诏颁行天下，诏中「政有阙失，朕躬是惧」八字传诵一时。星象渐隐，人心遂安。'
      },
      {
        label: '命钦天监禳祈化解',
        effects: { treasury: -60, people: 2 },
        result: '禳星道场做了七日，香烛钱粮花去不少。彗星自行隐去，皆大欢喜。'
      },
      {
        label: '天象自有常度，严禁讹言',
        effects: { court: -5, people: -3 },
        result: '讹言禁了，私下议论却更多。茶馆里说书人新排了一部《彗星扫紫微》，场场爆满。'
      }
    ]
  },
  {
    id: 'earthquake-capital',
    tag: '灾异',
    title: '京师地震',
    from: '顺天府 · 急奏',
    text: '京师地动，屋摇墙裂，民居倾倒无数，压伤者众。五城混乱，谣言四起。',
    weight: 5,
    options: [
      {
        label: '拨银赈恤，抚恤伤者',
        effects: { treasury: -150, people: 9 },
        result: '赈银帐篷即日下发，伤者得医，塌屋得修。灾民面朝大内方向磕头，额上尽是灰。'
      },
      {
        label: '祭天谢过',
        effects: { treasury: -40, people: 3, court: 3 },
        result: '皇上素服郊祭，诏中外修省。仪式庄严，赈济嘛……另议。'
      },
      {
        label: '地动乃常事，勿惊',
        effects: { people: -8 },
        result: '朝廷未出一文。灾民自发扒砖自救，说书人把这段编进了《彗星扫紫微》续集。'
      }
    ]
  },
  {
    id: 'solar-eclipse',
    tag: '灾异',
    title: '日有食之',
    from: '钦天监 · 预先推奏',
    text: '钦天监推算，三日后日食。自古日食为「天子失德」之象，请预行救护典礼，以答天戒。',
    weight: 5,
    options: [
      {
        label: '素服辍朝，诏求直言',
        effects: { court: 6, people: 3 },
        result: '日食当日，皇上素服立于庭中，百官救护如仪。随后求直言诏下，上疏者络绎。'
      },
      {
        label: '循例行救护礼即可',
        effects: { court: 2 },
        result: '锣鼓喧天的救护礼照办如仪，日食一刻即复。众人各回衙门，一切如常。'
      },
      {
        label: '日月之行，自有常数',
        effects: { court: -4 },
        result: '救护礼免了。钦天监老监正提着罗盘在院里转了一夜，嘴里念念有词。'
      }
    ]
  },
  {
    id: 'yellow-river-clear',
    tag: '灾异',
    title: '黄河水清',
    from: '河道总督 · 拜表称贺',
    text: '黄河中段水清三日，自古视为大祥瑞。总督拜表请贺，一时章疏塞途，皆称「圣人出、黄河清」。',
    weight: 4,
    options: [
      {
        label: '受贺，宣付史馆',
        effects: { treasury: -30, court: 3 },
        result: '贺表堆满一案。史馆提笔踌躇：河水三日之清，与圣德之关系，实难落笔。'
      },
      {
        label: '不许称贺，命查河工',
        effects: { court: 5, treasury: -20 },
        result: '「水清或因上流水弱，河患之兆未可知也。」敕查河工，果然查出几处淤浅。'
      },
      {
        label: '淡然处之',
        effects: {},
        result: '既不贺也不禁。黄河清了三日又黄了，像什么都没发生过。'
      }
    ]
  },

  // ── 异闻与杂项 ────────────────────────────────────────
  {
    id: 'foreign-envoy',
    tag: '异闻',
    title: '西洋使团朝贡',
    from: '礼部 · 奏',
    text: '西洋某国遣使入贡：自鸣钟、望远镜、世界舆图……使臣行鞠躬礼而不肯下跪，朝中哗然。',
    weight: 7,
    options: [
      {
        label: '入乡随俗，免跪亦可',
        effects: { court: -3, people: 2 },
        result: '使臣鞠躬觐见，献上世界舆图。皇上在图上找了半天，找到自家京城只是小小一点。'
      },
      {
        label: '天朝仪节，不可废',
        effects: { court: 4 },
        result: '跪拜礼争了半月，使团最终行礼如仪。望远镜留了下来，仪节的争议也留了下来。'
      },
      {
        label: '厚赐遣返，购其仪器',
        effects: { treasury: -100, army: 3, health: 2 },
        result: '重金购得望远镜、火炮图谱若干。皇上夜观天象，看得比钦天监还清楚。'
      }
    ]
  },
  {
    id: 'blood-horse',
    tag: '异闻',
    title: '进献汗血宝马',
    from: '西域使臣 · 贡单',
    text: '西域使臣进汗血宝马一匹，通体如火，日行千里。养马官请示：入御厩，还是另作他用？',
    weight: 5,
    options: [
      {
        label: '编入御厩，闲暇骑乘',
        effects: { treasury: -20, health: 4 },
        result: '宝马入御厩。皇上每隔数日骑射一番，太医院回奏：圣躬较前大为强健。'
      },
      {
        label: '转赐边关大将',
        effects: { army: 5 },
        result: '宝马出塞，大将如虎添翼。谢恩折子里说：每骑此马巡边，将士争睹天颜所赐。'
      },
      {
        label: '展出三日与民同乐',
        effects: { treasury: -10, people: 5 },
        result: '宝马于校场展出三日，京城扶老携幼来看「日行千里的神驹」，小贩们发了一笔。'
      }
    ]
  },
  {
    id: 'hanlin-poem',
    tag: '异闻',
    title: '翰林献诗',
    from: '翰林院 · 呈',
    text: '翰林学士献《圣德颂》长诗百韵，铺陈排比，辞藻华赡——只是通篇看下来，不知道说了什么。',
    weight: 5,
    options: [
      {
        label: '御笔和诗一首',
        effects: { court: 4 },
        result: '御制和诗一出，翰林们连夜捧读。据说是好诗，据说。'
      },
      {
        label: '赏银，命多写民生疾苦',
        effects: { treasury: -20, people: 3 },
        result: '「颂朕不如颂民，去写田家的谷、戍卒的霜。」学士领旨，新作果然换了人间。'
      },
      {
        label: '留中，不予置评',
        effects: { court: -2 },
        result: '《圣德颂》没了下文。翰林院里猜了半个月：圣意到底是深，还是烦？'
      }
    ]
  },
  {
    id: 'folk-ballad',
    tag: '异闻',
    title: '民间歌谣',
    from: '提刑按察使 · 密奏',
    text: '市井新出歌谣数首：有颂圣德的，也有暗讽时政的。按察使请示：是禁是纵？',
    weight: 5,
    options: [
      {
        label: '采风入乐府，观风俗知得失',
        effects: { people: 6, court: 2 },
        result: '歌谣采入乐府，讽时之作亦不罪。百姓惊讶之后是惊喜：原来皇上真的在听。'
      },
      {
        label: '讽时者一律查禁',
        effects: { people: -8, court: 3 },
        result: '禁令一出，歌谣转入地下，唱得更起劲了，还多了几首讽刺「禁歌」的新作。'
      },
      {
        label: '不闻不问',
        effects: { people: -2 },
        result: '歌谣自生自灭，唱的人渐渐也忘了。只有说书人的《彗星扫紫微》还在连更。'
      }
    ]
  },
  {
    id: 'banquet-ministers',
    tag: '异闻',
    title: '赐宴群臣',
    from: '光禄寺 · 请旨',
    text: '值岁末封印，光禄寺请赐宴百官，君臣同乐一日——只是光禄寺的家底，皇上心里有数。',
    weight: 5,
    options: [
      {
        label: '大宴，君臣尽欢',
        effects: { treasury: -100, court: 4, health: 2 },
        result: '御宴之上，皇上亲执盏劝酒，老臣感激涕零。次日，醉倒的官员请假条有一沓。'
      },
      {
        label: '小宴，清茶点心',
        effects: { treasury: -20, court: 2 },
        result: '清茶一盏、点心四色，君臣谈了半日政事。散席时，倒真有几分「共治天下」的意思。'
      },
      {
        label: '免宴，折成节敬散发',
        effects: { treasury: -30, court: 3 },
        result: '宴银折成节敬，连杂役太监都有一份。宫里宫外过了个踏实年。'
      }
    ]
  },
  {
    id: 'beggar-palace-gate',
    tag: '异闻',
    title: '宫门外的乞儿',
    from: '侍卫处 · 禀',
    text: '大雪之日，一乞儿僵卧宫墙根，被巡夜侍卫发现。如何处置，请示。',
    weight: 4,
    options: [
      {
        label: '赐食赐衣，问其疾苦',
        effects: { people: 6, health: -2 },
        result: '乞儿吃上热粥，说了半日家乡的赋税和灾情。次日，几道查勘的廷寄出了京。'
      },
      {
        label: '交五城御史安置',
        effects: { treasury: -20, people: 3 },
        result: '乞儿被送往粥厂。临走朝着宫门磕了个头，雪地里留下一个深深的人形。'
      },
      {
        label: '宫禁之地，送走了事',
        effects: { people: -3 },
        result: '乞儿被架走。当值侍卫夜里换班时嘀咕：那孩子看咱们的眼神，跟看城墙一样。'
      }
    ]
  },

  // ── 危机事件（条件触发）───────────────────────────────
  {
    id: 'treasury-crisis',
    tag: '危机',
    title: '国库告急',
    from: '户部 · 尚书跪奏',
    text: '户部存银告罄，各项开支却如流水。尚书跪地叩头：「部库之银，不足十日之用矣！」',
    weight: 14,
    condition: (s) => s.treasury < 300,
    options: [
      {
        label: '加征税赋以应急',
        effects: { treasury: 300, people: -13 },
        result: '加征诏下，税吏四出。国库是满了，民间卖儿鬻女者，也多了。'
      },
      {
        label: '开捐纳之例，卖官补库',
        effects: { treasury: 350, court: -11 },
        result: '银子滚滚而来，官帽明码标价。正经科甲出身者集体挂冠抗议：斯文扫地！'
      },
      {
        label: '裁宫中用度，躬行节俭',
        effects: { treasury: 100, people: 5, court: 2 },
        result: '宫中用度裁撤大半，御膳减为四品。天下闻之，颂声大起；内务府的账房，哭声大起。'
      }
    ]
  },
  {
    id: 'army-morale-crisis',
    tag: '危机',
    title: '军心浮动',
    from: '兵科给事中 · 密奏',
    text: '各镇士卒困苦，逃亡日众，甚至有倒戈投虏者。军心之坏，已非一日，恐酿大变。',
    weight: 14,
    condition: (s) => s.army < 35,
    options: [
      {
        label: '倾库劳军，重赏养威',
        effects: { treasury: -200, army: 12 },
        result: '劳军银两抬进营门，将士山呼震野。老卒捧着饷银落泪：几年没见过足额的饷了。'
      },
      {
        label: '严刑峻法，连坐缉逃',
        effects: { army: 5, people: -6, court: -3 },
        result: '逃兵少了，营中的鞭子声却日夜不休。兵是看住了，心没看住。'
      },
      {
        label: '裁汰老弱，精选锐卒',
        effects: { treasury: 50, army: 7, people: 2 },
        result: '老弱发给路费归农，锐卒足饷足操。营伍精干了许多，只是人数少了。'
      }
    ]
  },
  {
    id: 'people-unrest',
    tag: '危机',
    title: '民怨沸腾',
    from: '都察院 · 急奏',
    text: '数省民变蜂起：抗粮、闹衙、夺米。虽尚属乌合，然星星之火，可以燎原，不可不慎。',
    weight: 14,
    condition: (s) => s.people < 35,
    options: [
      {
        label: '减免钱粮，招抚安民',
        effects: { treasury: -200, people: 14 },
        result: '减赋诏与招抚令同发，乱民陆续散归田里。为首数人免死屯田，天下称仁。'
      },
      {
        label: '调兵弹压，以儆效尤',
        effects: { treasury: -120, people: -8, army: 3 },
        result: '官兵一到，乱民星散。剿平是剿平了，民间的怨气，转入了地下。'
      },
      {
        label: '派钦差查办贪官以谢民',
        effects: { treasury: -50, people: 9, court: 4 },
        result: '几名激起民变的墨吏锁拿进京。乱民散去时说：皇上还是明白的，明白就好。'
      }
    ]
  },
  {
    id: 'court-disorder',
    tag: '危机',
    title: '政令不出午门',
    from: '内阁 · 辅臣联名奏',
    text: '朝廷诏令发出去，各省或拖延、或阳奉阴违、或索性「暂缓办理」。政令出不了午门，国将不国。',
    weight: 14,
    condition: (s) => s.court < 35,
    options: [
      {
        label: '遣钦差巡按各省，严核政绩',
        effects: { treasury: -100, court: 12 },
        result: '钦差陆续出京，各省的「暂缓办理」一夜之间全办了。政令重新出得了午门。'
      },
      {
        label: '大赏干练之臣，树为标杆',
        effects: { treasury: -80, court: 8 },
        result: '几位实心任事的官员连升数级，官场风气悄悄转向：干活的终于比拍马的吃香了。'
      },
      {
        label: '亲自坐镇早朝，事必躬亲',
        effects: { court: 9, health: -8 },
        result: '五更即起，日日视朝，迟到的外官当廷申饬。百官凛凛，皇上却也肉眼可见地憔悴。'
      }
    ]
  },
  {
    id: 'health-warning',
    tag: '危机',
    title: '圣躬违和',
    from: '太医院 · 跪奏',
    text: '太医院跪奏：皇上形容清减、夜不能寐、批折时手颤。再这般操劳，恐圣躬难支，社稷动摇。',
    weight: 16,
    condition: (s) => s.health < 40,
    options: [
      {
        label: '放下政务，静养一月',
        effects: { health: 18, court: -4 },
        result: '一月不视朝，奏折由内阁票拟处分。圣躬渐复，阁权却悄悄重了三分。'
      },
      {
        label: '减半工作量，兼顾养息',
        effects: { health: 10 },
        result: '每日只批紧要折子，午后小憩。太医院回诊：脉象渐平，忧劳之症稍解。'
      },
      {
        label: '朕的江山，岂能歇',
        effects: { health: -10, court: 3 },
        result: '朱批依旧到三更。太监们发现，皇上的字，越来越潦草了。'
      }
    ]
  }
]
