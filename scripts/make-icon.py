from PIL import Image, ImageDraw
from pathlib import Path
import math
out=Path(__file__).resolve().parent.parent/'assets'
out.mkdir(exist_ok=True)
image=Image.new('RGB',(1024,1024),'#0F6E56')
d=ImageDraw.Draw(image)
points=[]
for i in range(361):
 t=2*math.pi*i/360
 x=16*math.sin(t)**3
 y=13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t)
 points.append((512+x*18,485-y*18))
d.line(points,fill='#F9FAF6',width=22,joint='curve')
d.line([(263,516),(406,516),(460,392),(534,620),(590,516),(761,516)],fill='#CDE2B9',width=22,joint='curve')
image.save(out/'icon.png')
image.save(out/'adaptive-icon.png')
