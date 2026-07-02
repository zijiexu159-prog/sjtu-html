% layout: touying-main-complete.layout.json
% title: 外场作用下向列型液晶定常剪切流的定性分析
% subtitle: 本科毕业设计答辩 · HTML 完整转换示例
% author: 徐子杰　指导教师：于江
% institution: 上海交通大学
% footer: 上海交通大学
% transition: fade

# 研究背景与模型

## 研究背景与模型建立

--- Ericksen--Leslie 模型[2][0.53,0.47][transition=rise]

||[1][1]

### 控制方程[slide-right]
::: formula E-L 方程
$$
\begin{cases}
\rho \dot v_i=\rho F_i-(p+w_F)_{,i}+\tilde g_j n_{j,i}+G_jn_{j,i}+\tilde t_{ij,j},\\
\left(\dfrac{\partial w_F}{\partial n_{i,j}}\right)_{,j}-\dfrac{\partial w_F}{\partial n_i}+\tilde g_i+G_i=\lambda n_i,\\
|n|=1,\qquad \nabla\cdot v=0.
\end{cases}
$$
:::

||[1][1]

### 参数意义[zoom]
- $v$：描述液晶流体运动的速度场。
- $n$：描述分子平均取向的指向矢。
- $w_F$：Oseen--Frank 弹性能。
- $\tilde t_{ij},\tilde g_i$：Leslie 黏性应力与内力矩。
- $F_i,G_i$：外场诱导的体力与广义力矩。

--- 平面剪切流设定[2][0.47,0.53]

### 几何与边界[fade-up]
- $v=(v(y,t),0,0)$。
- $n=(\cos\phi(y,t),\sin\phi(y,t),0)$。
- $v(0)=v_0,\ v(d)=v_d$。
- $\phi(0)=\phi_0,\ \phi(d)=\phi_d$。

::: note 外场作用
外加恒定磁场与重力场改变力矩平衡，从而影响稳态结构。
:::

### 约化系统[zoom]
::: formula 平面剪切流下的约化系统
$$
\begin{cases}
\rho v_t=\partial_y\!\left(g(\phi)v_y+h(\phi)\phi_t\right)+\rho F_1,\\
\gamma_1\phi_t=f(\phi)\phi_{yy}+\dfrac12f'(\phi)\phi_y^2-h(\phi)v_y-G_1\sin\phi+G_2\cos\phi.
\end{cases}
$$
:::

--- 从无场到含外场模型[1]

### 模型变化
#### 无外场模型[1-2][slide-right]
::: formula 无场约化系统
$$
\begin{cases}
\rho v_t=\partial_y\!\left(g(\phi)v_y+h(\phi)\phi_t\right),\\
\gamma_1\phi_t=f(\phi)\phi_{yy}+\dfrac12f'(\phi)\phi_y^2-h(\phi)v_y.
\end{cases}
$$
:::

#### 含外场模型[3-][zoom]
::: formula 含外场约化系统
$$
\begin{cases}
\rho v_t=\partial_y\!\left(g(\phi)v_y+h(\phi)\phi_t\right),\\
\gamma_1\phi_t=f(\phi)\phi_{yy}+\dfrac12f'(\phi)\phi_y^2-h(\phi)v_y
-\dfrac{\chi_aH_0^2}{2}\sin 2(\phi-\theta_H).
\end{cases}
$$
:::

#v(1em)

::: note 外场势能
$\Psi_m=-\rho gy+\dfrac{\chi_a}{2}(n\cdot H)^2$，其中
$H=H_0(\cos\theta_H,\sin\theta_H,0)$。
:::

## 稳态方程到二维自治系统

--- 二维自治系统[2][0.4,0.6]

### 相变量与稳态条件[slide-right]
- 引入相变量 $\eta=f(\phi)\phi'$。
- 令 $v_t=\phi_t=0$。
- 取磁场方向 $\theta_H=\pi/4$。
- $B=\chi_aH_0^2/2$ 表征磁场强度。

### 自治系统[zoom]
$$ {#autonomous}
\begin{cases}
\phi'=\dfrac{\eta}{f(\phi)},\\
\eta'=\dfrac{f'(\phi)\eta^2}{2f(\phi)^2}
+B\left(\dfrac{ah(\phi)}{g(\phi)}-\cos2\phi\right).
\end{cases}
$$

::: note 参数
$a$ 来自速度方程；$f,g,h$ 分别包含 Frank 弹性参数与 Leslie 黏性参数，并且 $f,g>0$。
:::

# Hamilton 结构与平衡点分类

## Hamilton 结构

--- Hamilton 函数[1]

::: theorem Hamilton 函数
$$
H(\eta,\phi)=\frac{\eta^2}{2f(\phi)}-BG(\phi),\qquad
G(\phi)=\int_{\phi_0}^{\phi}
\left(\frac{ah(t)}{g(t)}-\cos2t\right)\,dt.
$$
:::

### 两个直接推论[fade-up]
积分曲线满足
$$
H(\eta,\phi)=C,\qquad
\eta=\pm\sqrt{2f(\phi)(BG(\phi)+C)}.
$$

|||

由 $\eta=f(\phi)\phi'$ 可知
$$ {#initial-length}
d=\int_{\Gamma_C}\frac{f(\phi)}{\eta}\,d\phi.
$$

--- 平衡点与核心多项式[2][0.47,0.53]

### 平衡点条件[slide-right]
由 @eq:autonomous 可知平衡点满足
$$
\eta=0,\qquad \frac{ah(\phi)}{g(\phi)}-\cos2\phi=0.
$$

令 $x=\cos2\phi$，定义
$$
P(x)=ah_x(x)-xg_x(x).
$$

### 根结构决定平衡点结构[zoom]
::: theorem 核心判据
平衡点分类转化为研究 $P(x)=0,\ x\in[-1,1]$ 的根结构。
:::

- 无根：无平衡点。
- 内部简单根：一鞍点与一中心。
- 内部二重根：退化尖点。
- 内部三重根：退化鞍点与退化中心。
- 端点根：产生不同阶的退化尖点。

# 通有相图分类

## 跨周期异宿轨道不存在性

--- 跨周期异宿轨道[2][0.58,0.42]

![跨周期鞍点异宿连接示意图](../assets/figures/cross-period-heteroclinic.svg)

### 目标与必要条件[zoom]
::: alert 目标
排除 $|S_b-S_a|\geq\pi$ 的跨周期异宿连接。
:::

若两个鞍点由异宿轨连接，则它们的 Hamilton 量必须相同：
$$
H(0,S_a)=H(0,S_b).
$$

--- 证明思路与意义[2]

### 周期积分[slide-right]
::: theorem 周期积分
记
$$
I=\int_0^\pi \frac{h(\phi)}{g(\phi)}\,d\phi.
$$
在 Leslie 热力学约束下有 $I>0$。
:::

若 $I=0$，可推出 $E=\gamma_2^2/\gamma_1$，与热力学约束矛盾。

### 排除连接[zoom]
- 相隔一周期时，与周期积分非零矛盾。
- 超过一周期时，连接轨必须穿过一条不存在同能级点的直线，产生矛盾。

::: note 意义
后续相图分类只需讨论同一周期内的局部同宿与异宿连接。
:::

## 根结构决定相图骨架

--- 无根与尖点[2]

![无根：相图中没有平衡点](../assets/figures/无根.svg)

![三阶尖点：边界处最低阶退化尖点](../assets/figures/3阶尖点.svg)

--- 单根与三重根[2]

![一个简单根：出现非退化中心与鞍点](../assets/figures/一简单根-无尖点.svg)

![仅有三重根：高阶退化临界边界](../assets/figures/三重根.svg)

--- 仅有两个简单根[3][0.33,0.33,0.34]

![两个简单根 I：同宿环交集为空](../assets/figures/两简单根-无尖点-1.svg)

![两个简单根 II：形成异宿连接](../assets/figures/两简单根-无尖点-2.svg)

![两个简单根 III：一个鞍点位于另一同宿环内](../assets/figures/两简单根-无尖点-3.svg)

--- 简单根与尖点根[3]

![两简单根加尖点 I](../assets/figures/两简单根-有尖点-1.svg)

![两简单根加尖点 II](../assets/figures/两简单根-有尖点-2.svg)

![两简单根加尖点 III](../assets/figures/两简单根-有尖点-3.svg)

## 三简单根情形的分类

--- 右支配鞍点与积分判据[2][0.55,0.45]

### 积分判据[slide-right]
设
$$
S_1<S_2<\widehat S<S_3=S_1+\pi,
$$
并定义
$$
J_1=\int_{S_1}^{S_2}Q(\phi)d\phi,\quad
J_2=\int_{S_2}^{\widehat S}Q(\phi)d\phi,\quad
Q(\phi)=\frac{ah(\phi)}{g(\phi)}-\cos2\phi.
$$

### 分类框架[zoom]
::: definition X 型
右支配鞍点形成异宿连接：$X_1$、$X_2$ 与 $X_{12}$。
:::

::: definition H 型
右支配鞍点未形成异宿连接：$H_0$、$H_1$ 与 $H_2$。
:::

--- X 型相图[2]

### X1 型
#### X1 负型[1-2]
![X1-：J1 小于零](../assets/figures/三简单根-x_1^-.svg)

#### X1 正型[3-4]
![X1+：J1 大于零](../assets/figures/三简单根-x_1^+.svg)

### X12 与 X2 型
#### X12 型[1-2]
![X12：J1=J2=0](../assets/figures/三简单根-x_12.svg)

#### X2 型[3-4]
![X2：J1+J2=0](../assets/figures/三简单根-x_2.svg)

--- H0 型相图[3]

![H0-：J2>0，J1<0](../assets/figures/三简单根-H_0^-.svg)

![H0 0：J2>0，J1=0](../assets/figures/三简单根-H_0^0.svg)

![H0+：J2>0，J1>0](../assets/figures/三简单根-H_0^+.svg)

--- H1 型相图[2][0.62,0.38]

![H1：从 H0 到 H2 的过渡区域](../assets/figures/三简单根-H_1.svg)

### 判据说明[zoom]
- $J_2<0$：从 $S_2$ 到右支配鞍点能级下降。
- $J_1+J_2>0$：保持 $S_1$ 高于 $\widehat S$。
- 因而它是从 $H_0$ 到 $H_2$ 的过渡区域。

--- H2 型相图[3]

![H2-：J2<0，J1<0](../assets/figures/三简单根-H_2^-.svg)

![H2 0：J2<0，J1=0](../assets/figures/三简单根-H_2^0.svg)

![H2+：J2<0，0<J1<-J2](../assets/figures/三简单根-H_2^+.svg)

# 长度函数与边值解分类

## 边值解：相轨道与长度匹配

--- 从相轨道到边值解[2]

### m-解[slide-right]
固定边界取向
$$
\phi(0)=\phi_0,\qquad \phi(d)=\phi_d+m\pi.
$$

相轨道 $\Gamma_C$ 若能从 $\phi_0$ 到达 $\phi_d+m\pi$，并满足板间距条件，则给出一个 $m$-解。

### 统一长度条件[zoom]
由 @eq:initial-length 得
$$
dy=
\begin{cases}
\sqrt{\dfrac{f(\phi)}{B(G(\phi)+C)}}d\phi,&\eta\geq0,\\
-\sqrt{\dfrac{f(\phi)}{B(G(\phi)+C)}}d\phi,&\eta<0.
\end{cases}
$$

因此边值问题化为
$$
\sqrt B\,d=\mathcal L(C,\text{轨道类型}).
$$

--- 三类轨道[3]

### 单调绕数解[fade-up]
![单调绕数解](../assets/figures/monotone_winding_solution.png)

### 非单调绕数解[fade-up]
![非单调绕数解](../assets/figures/nonmonotone_winding_solution.png)

### 振荡解[fade-up]
![振荡解](../assets/figures/vibrating_solution.png)

## 三类长度函数的定义

--- 长度函数[1]

::: formula 单调与非单调绕数解
$$
\begin{aligned}
M_m(C)&=\int_{\phi_0}^{\phi_d+m\pi}
\sqrt{\frac{f(\phi)}{G(\phi)+C}}\,d\phi,\\
N_m(\alpha)&=2\int_\alpha^{\phi_0}
\sqrt{\frac{f(\phi)}{G(\phi)-G(\alpha)}}\,d\phi
+\int_{\phi_0}^{\phi_d+m\pi}
\sqrt{\frac{f(\phi)}{G(\phi)+C}}\,d\phi.
\end{aligned}
$$
:::

::: formula 振荡解的基本长度
$$
\begin{aligned}
A^r(\phi_{\min})&=\int_{\phi_{\min}}^{\phi_0}
\sqrt{\frac{f(\phi)}{G(\phi)-G(\phi_{\min})}}\,d\phi,\\
A^l(\phi_{\min})&=\int_{\phi_d}^{\phi_C^{\max}}
\sqrt{\frac{f(\phi)}{G(\phi)-G(\phi_{\min})}}\,d\phi,\\
A^m(\phi_{\min})&=\int_{\phi_0}^{\phi_d}
\sqrt{\frac{f(\phi)}{G(\phi)-G(\phi_{\min})}}\,d\phi.
\end{aligned}
$$
:::

## 长度函数的应用

--- 单调与非单调解的存在性[2]

### 单调 m-绕数解[slide-right]
::: theorem 单调解命题
记 $B_m=M_m^2(0)/d^2$。若 $B>B_m$，则没有单调 $m$-绕数解；若 $B\leq B_m$，则存在唯一单调 $m$-绕数解。
:::

### 非单调 m-绕数解[zoom]
::: theorem 非单调解命题
在不同尖点区间 $I_n$ 上定义阈值
$$
B_{m,n}=\frac1{d^2}\min_{\alpha\in I_n}N_m(\alpha)^2.
$$
跨过阈值 $B_{m,n}$ 时，非单调解由不存在变为至少一个，再变为至少两个。
:::

--- 振荡解与端点模式[2]

### 四类端点模式[slide-right]
- $r,l$ 型：$\sqrt Bd=(2k-1)A+A_r$。
- $l,r$ 型：$\sqrt Bd=2kA+A_m$。
- $r,r$ 型：$\sqrt Bd=(2k-1)A+A_r-A_l$。
- $l,l$ 型：$\sqrt Bd=(2k-1)A-A_r+A_l$。

### 三重根情形[zoom]
![三重根相图](../assets/figures/三重根.svg)

::: theorem 存在性结论
磁场强度超过相应阈值后，至少存在对应端点模式与绕数的振荡解。
:::

# 总结与展望

## 总结与展望

--- 创新点与主要结论[1][transition=rise]

- 从 Ericksen--Leslie 模型出发，引入恒定磁场与重力场，建立外场作用下平面剪切流的稳态边值问题。
- 利用二维系统的 Hamilton 结构与三次多项式 $P(x)$ 的根结构，分类平衡点与通有相图。
- 证明跨周期鞍点异宿连接不存在，并将周期内临界连接转化为积分零点问题。
- 使用长度函数把相轨道分类转化为边值解的存在性与个数判据。

--- 不足与展望[2]

### 当前不足[slide-right]
- 临界退化情形仍有待进一步讨论。
- 部分长度函数的全局单调性与极值个数仍需分析。
- 需要获得更精确的解个数结论。

### 后续研究[zoom]
- 研究稳态解作为 E-L 方程平衡态的稳定性。
- 讨论参数变化诱导的分岔结构。
- 将理论分类与数值验证进一步结合。

--- 参考文献[1]

::: note 主要参考文献
Jiao, Jia; Huang, Kaiyin; Liu, Weishi. Stationary Shear Flows of Nematic Liquid Crystals: A Comprehensive Study via Ericksen--Leslie Model. Journal of Dynamics and Differential Equations, 2022.
:::

::: note 理论基础
Ericksen 的液晶守恒律、Leslie 本构方程以及 Oseen--Frank 弹性理论。
:::