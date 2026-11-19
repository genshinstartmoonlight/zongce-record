from pathlib import Path
import json

HERE=Path(__file__).resolve().parent
source=HERE/'source-data.json'
if not source.exists():
 source=HERE.parent/'综测细则梳理'/'综测细则_层级数据.json'
raw=json.loads(source.read_text(encoding='utf-8'))
nodes={}
def walk(n):
    nodes[n['id']]={k:v for k,v in n.items() if k!='children'}
    nodes[n['id']]['sourceCap']=n['cap']
    nodes[n['id']]['details']=[c['id'] for c in n['children']]
    for c in n['children']:walk(c)
walk(raw['tree'])

def ids(*nums):return ['item-'+str(x) for x in nums]
nav={
 4:ids(5,19,52),5:ids(6,10),6:ids(7,8,9),10:ids(*range(11,19)),19:ids(20,30,46),52:ids(53,54,55),
 56:ids(57,65,101),57:ids(58,59,63,64),59:ids(60,61,62),65:ids(66,86,99,100),66:ids(67,76),86:ids(87,94),
 102:ids(103,108,118),103:ids(104,105),105:ids(106,107),108:ids(109,110,111),
 119:ids(120,124,132),120:ids(121,122,123),124:ids(125,126),
 133:ids(134,139,142),134:ids(135,138),135:ids(136,137),139:ids(140,141)
}
caps={4:None,5:None,6:35,7:10,8:20,9:5,10:None,**{x:5 for x in range(11,19)},19:30,20:10,30:10,46:10,52:10,53:10,54:10,55:10,
 56:None,57:70,58:20,59:30,60:10,61:10,62:10,63:10,64:10,65:30,66:30,67:30,76:25,86:30,87:30,94:15,99:10,100:10,101:10,
 102:None,103:80,104:40,105:40,106:20,107:20,108:20,109:5,110:5,111:10,118:10,
 119:None,120:80,121:80,122:50,123:40,124:20,125:10,126:10,132:10,
 133:None,134:80,135:60,136:50,137:10,138:20,139:20,140:15,141:5,142:10,143:10}
labels={5:'基础性评价',19:'发展性评价',52:'奖励性评价',57:'基础性评价',65:'发展性评价',101:'奖励性评价',103:'基础性评价',108:'发展性评价',118:'奖励性评价',120:'基础性评价',124:'发展性评价',132:'奖励性评价',134:'基础性评价',139:'发展性评价',142:'奖励性评价',
 11:'思政德育类讲座',12:'爱国主义教育基地实践',13:'形势与政策、军事类课程考核',14:'年级大会、班会、团日活动等',15:'职业发展、成长指导及观摩',16:'年度心理健康测评',17:'心理健康讲座、活动',20:'荣誉称号及获奖',53:'省市级及以上德育荣誉',54:'助人为乐等行为受到表彰',55:'为学校争得德育荣誉',60:'科研项目训练或双创活动',61:'学术讲座、科技企业等活动',87:'学术论文',94:'大学生创新创业训练计划项目',99:'授权发明专利',104:'体质健康测试',106:'体育竞赛及活动参与',107:'课外自主锻炼',109:'体测成绩奖励',126:'文艺活动及作品发表',137:'公共卫生或学生社区轮值劳动',143:'学校特别奖励'}

categories=[dict(id='item-4',key='de',short='德',name='德育评价',weight=.5,english='MORAL DEVELOPMENT'),dict(id='item-56',key='zhi',short='智',name='智育评价',weight=.2,english='INTELLECTUAL GROWTH'),dict(id='item-102',key='ti',short='体',name='体育评价',weight=.1,english='PHYSICAL WELLBEING'),dict(id='item-119',key='mei',short='美',name='美育评价',weight=.1,english='AESTHETIC EDUCATION'),dict(id='item-133',key='lao',short='劳',name='劳育评价',weight=.1,english='LABOR & PRACTICE')]

def choice(cap,options,label='完成情况'):
 return dict(type='choice',cap=cap,label=label,options=[[str(v),t] for v,t in options])
def threshold(cap,count):return dict(type='count',cap=cap,label='已参加次数',threshold=count,award=cap)
inputs={
 11:threshold(5,2),12:threshold(5,1),14:threshold(5,4),15:threshold(5,1),17:threshold(5,2),61:threshold(10,5),106:threshold(20,4),137:threshold(10,2),138:threshold(20,2),
 13:choice(5,[(5,'本年级要求的课程均合格且获学分'),(0,'未达到课程要求')],'课程考核情况'),
 16:choice(5,[(5,'已全部完成'),(0,'未全部完成')]),18:choice(5,[(5,'已完成'),(0,'未完成')]),
 58:choice(20,[(20,'未出现无故旷课'),(0,'出现无故旷课')],'课堂出勤情况'),
 62:choice(10,[(10,'已完成要求题量'),(0,'未完成要求题量')]),
 63:choice(10,[(10,'符合学术诚信要求'),(0,'存在学术不端等相关行为')],'学术诚信情况'),
 64:choice(10,[(10,'可提供至少一项应用能力证明'),(0,'无法提供相关证明')],'能力证明情况'),
 60:dict(type='count',cap=10,label='参加项目或活动数量',rate=5),
 100:dict(type='csp',cap=10,label='CSP成绩（0—500）'),
 104:choice(40,[(40,'体测合格及以上／当年免测'),(0,'体测不合格')],'体测情况'),
 107:choice(20,[(20,'课外自主锻炼达标'),(0,'未达标')]),
 109:choice(5,[(0,'合格'),(3,'良好'),(5,'优秀')],'体测成绩等级'),
 110:choice(5,[(5,'相关课程≥85分，达到技能要求'),(0,'未达到要求')]),
 121:dict(type='count',cap=80,label='参演次数',rate=35),122:dict(type='count',cap=50,label='参加次数',rate=15),123:dict(type='count',cap=40,label='出席次数',rate=5),
 125:choice(10,[(10,'已完成2学分且成绩合格'),(0,'未达到要求')],'美育课程修读情况'),
 136:dict(type='dorm',cap=50,label='检查平均评价得分（满分50）'),
 140:dict(type='hours',cap=15,label='服务性劳动小时数',rate=1),
 141:choice(5,[(5,'已参加至少1次符合要求的活动'),(0,'未参加')])}

warnings={
 5:'原文定性35分、定量35分，推得基础性70分；但定量8项合计40分。此处展示已提交原始分，合计上限待学院确认。',
 10:'原文写满分35分，但8项各5分，合计40分。先完整记录各项，不擅自扣除某项或截为35分。',
 52:'本模块原则上不超过德育评价总分的10%。按百分制暂设记录上限10分，最终以学院认定为准；三个条件共享限额。',
 66:'同届同项取最高奖，多项赛事取单项最高分。此处按单项最高汇总；两类赛事的兼计口径以学院核定为准。',
 76:'原文团体赛同时列排名比例与成员角色比例，适用关系未明确。请按学院核定结果填写，不自动叠乘。',
 87:'论文及项目如何合并累计以学院口径为准。此处记录本项确认得分，并受学术成果与发展性评价30分上限限制。',
 94:'同年度多个大创项目只认定一次最高级别项目。负责人所属学院与个人角色的折算，按学院核定口径填写。',
 111:'代表队训练5分也包含在本项10分内。校运动会第14—16名按原文字面会出现负分，须确认后填写。',
 120:'参演、参加、出席共同受基础性80分上限限制。同一活动不同身份能否兼计，原文未明确，请避免未经认定的重复记录。',
 126:'艺术团训练及展示5分包含在本项10分内。原文没有单列文艺作品发表的固定分值。',
 140:'与德育发展性评价中的实践活动不重复计分。不足整小时如何折算，按学院认定填写有效小时数。',
 141:'与智育基础性评价中的学术活动不重复计分。',
 143:'原则累计不超过10分，同一成果不能与普通奖励性评价重复计分。原文未明确加入哪一级公式，暂单列，不直接加到综合分。'}

root_ids={c['id'] for c in categories}
def configure(nid,cat,depth):
 node=nodes[nid];num=int(nid.split('-')[1])
 node.update(nav=nav.get(num,[]),cap=caps.get(num),label=labels.get(num,node['title']),category=cat,depth=depth)
 if num in warnings:node['warning']=warnings[num]
 if num==66:node['mode']='max'
 if not node['nav']:
  node['input']=inputs.get(num,dict(type='score',cap=caps.get(num,10),label='本项已确认得分'))
 for cid in node['nav']:configure(cid,cat,depth+1)
for cat in categories:configure(cat['id'],cat['id'],1)
configure('item-143','summary',2)

reachable=[]
def collect(nid):
 reachable.append(nid)
 for child in nodes[nid]['nav']:collect(child)
for cat in categories:collect(cat['id'])
collect('item-143')
leaves=[x for x in reachable if not nodes[x]['nav']]
assert max(nodes[x]['depth'] for x in reachable)<=4
assert len(leaves)==len(set(leaves))
model=dict(version=1,title='SCU CS 综测记录',categories=categories,nodes=nodes,leaves=leaves,
           issues=raw['issues'],sourceName='本科生综合素质评价实施办法（2025年版）')
(HERE/'data.js').write_text('window.REVIEW_MODEL = '+json.dumps(model,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
template='''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#207768"><meta name="color-scheme" content="light"><title>SCU CS · 综测记录</title><style>__STYLE__</style></head>
<body><div id="app"><main id="screen"></main><nav id="nav" class="nav" aria-label="评价类别"></nav></div><div id="toast" class="toast" role="status" aria-live="polite" hidden></div><noscript><p>请使用支持JavaScript的浏览器打开，以记录和汇总得分。</p></noscript><script>__DATA__</script><script>__ENGINE__</script><script>__APP__</script></body></html>'''
for token,filename in [('__STYLE__','styles.css'),('__DATA__','data.js'),('__ENGINE__','scoring.js'),('__APP__','app.js')]:
 template=template.replace(token,(HERE/filename).read_text(encoding='utf-8').replace('</script','<\\/script'))
(HERE/'index.html').write_text(template,encoding='utf-8')
print(f'Built {len(leaves)} submission items; navigation depth <=4; self-contained index.html.')
