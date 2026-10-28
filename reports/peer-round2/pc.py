import sys,math
a=open(sys.argv[1]).read();b=open(sys.argv[2]).read();n=len(a)
g=sum(1 for x,y in zip(a,b) if x!='W' and y=='W');l=sum(1 for x,y in zip(a,b) if x=='W' and y!='W')
d=(b.count('W')-a.count('W'))/n;se=math.sqrt(g+l-(g-l)**2/n)/n
print(f"{sys.argv[1]} old {a.count('W')/n:.3f} new {b.count('W')/n:.3f} diff {d*100:+.1f}pt ±{1.96*se*100:.1f} gained {g} lost {l}")
