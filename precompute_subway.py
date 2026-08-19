import json, math, urllib.request, os

OUT_DIR = 'E:/github/zentrix566.github.io/src/features/subway/data'
OUT = os.path.join(OUT_DIR, 'subwayData.json')
AMAP = 'https://map.amap.com/service/subway?_1469083453978&srhdata=1100_drw_beijing.json'

# 北京地铁官方线路主题色（按运营方公布标准，覆盖已知线路）
# 未覆盖线路（如 3 号线、18 号线）仍沿用高德返回的实时色值作为回退
LINE_COLORS = {
    '1号线八通线': '#C8102E',
    '2号线': '#004E80',
    '3号线': '#C9102E',
    '4号线大兴线': '#00A651',
    '5号线': '#A83279',
    '6号线': '#D09828',
    '7号线': '#F29400',
    '8号线': '#00A06E',
    '9号线': '#00B6BC',
    '10号线': '#0091D5',
    '11号线': '#E64398',
    '12号线': '#943E2D',
    '13号线': '#F3D349',
    '14号线': '#C78BBF',
    '15号线': '#9E4D9C',
    '16号线': '#62B446',
    '17号线': '#009E99',
    '18号线': '#685BC6',
    '19号线': '#D55E8D',
    '亦庄线': '#D478B1',
    '房山线': '#E87722',
    '燕房线': '#E4402B',
    '昌平线': '#E678A2',
    'S1线': '#A94F2F',
    '西郊线': '#D81E05',
    '首都机场线': '#8078A4',
    '大兴机场线': '#233B76',
}


def fetch_json(url, timeout=40):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


print('拉取高德地铁线网数据...')
raw = fetch_json(AMAP)
lines_raw = raw['l']
print(f'原始线路数: {len(lines_raw)}')

lines = []
for ln in lines_raw:
    name = ln.get('ln') or ln.get('kn')
    if not name:
        continue
    loop = str(ln.get('lo')) == '1'
    stations = []
    seen = set()
    for s in ln.get('st', []):
        nm = s.get('n')
        sl = s.get('sl')
        if not nm or not sl:
            continue
        try:
            lng, lat = (float(x) for x in sl.split(','))
        except Exception:
            continue
        if nm in seen:
            continue
        seen.add(nm)
        stations.append({'n': nm, 'lng': round(lng, 6), 'lat': round(lat, 6)})
    if not stations:
        continue
    # 高德官方线色（北京地铁真实线路色），缺失时留空，由前端回退调色板
    cl = ln.get('cl')
    color = ('#' + cl) if cl else ''
    lines.append({'name': name, 'loop': loop, 'color': color, 'stations': stations})

# 用标准主题色覆盖高德返回的色值
for l in lines:
    if l['name'] in LINE_COLORS:
        l['color'] = LINE_COLORS[l['name']]

# 统计去重站名数（用于说明）
all_names = set()
for l in lines:
    for s in l['stations']:
        all_names.add(s['n'])

os.makedirs(OUT_DIR, exist_ok=True)
out = {
    'source': 'amap beijing subway network (live)',
    'note': 'distance 为运行时按经纬度 haversine 计算的站间直线距离(米)，可作道路距离的良好近似',
    'lines': lines,
}
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
sz = os.path.getsize(OUT)
print(f'完成: {len(lines)} 条线, {len(all_names)} 个去重车站')
print(f'输出: {OUT} ({sz/1024:.1f} KB)')
