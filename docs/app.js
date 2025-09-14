// Gerar id único simples
function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Carregar estado salvo
const state = {
    transacoes: JSON.parse(localStorage.getItem('transacoes') || '[]'),
    tipoSelecionado: 'receita' // Valor padrão
};

// Referências DOM
const form = document.getElementById('trans-form');
const valorInput = document.getElementById('valor');
const catInput = document.getElementById('categoria');
const saldoDiv = document.getElementById('saldo');
const lista = document.getElementById('lista-transacoes');
const btnSimular = document.getElementById('btn-simular');
const btnLimpar = document.getElementById('btn-limpar');
const ctxCategorias = document.getElementById('graf-categorias').getContext('2d');
const ctxSaldo = document.getElementById('graf-saldo').getContext('2d');
const tipoButtons = document.querySelectorAll('.tipo-btn');
const coinElement = document.getElementById('coin');

// Variáveis de gráfico
let chartCategorias = null;
let chartSaldo = null;

// Animação da moeda
let currentFrame = 21;
const totalFrames = 30;
let animationInterval;

function startCoinAnimation() {
    // Limpa qualquer intervalo existente
    if (animationInterval) clearInterval(animationInterval);
    
    animationInterval = setInterval(() => {
        currentFrame++;
        if (currentFrame > totalFrames) {
            currentFrame = 21;
        }
        coinElement.src = `coin/Gold_${currentFrame}.png`;
    }, 80); // Ajuste a velocidade aqui (milissegundos)
}

function stopCoinAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
}

// botões de tipo
tipoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remover a classe active de todos os botões
        tipoButtons.forEach(b => b.classList.remove('active'));
        
        // Adicionar a classe active ao botão clicado
        btn.classList.add('active');
        
        // Atualizar o tipo selecionado
        state.tipoSelecionado = btn.dataset.tipo;
    });
});

// Adicionar transação
form.addEventListener('submit', e => {
    e.preventDefault();
    const valor = parseFloat(valorInput.value);
    if (isNaN(valor)) return;
    
    const trans = {
        id: makeId(),
        valor,
        tipo: state.tipoSelecionado,
        categoria: catInput.value.trim() || 'sem categoria',
        data: new Date().toISOString()
    };
    
    state.transacoes.push(trans);
    saveState();
    render();
    form.reset();
});

// Salvar no localStorage
function saveState() {
    localStorage.setItem('transacoes', JSON.stringify(state.transacoes));
}

// Calcular saldo
function calcularSaldo() {
    return state.transacoes.reduce((acc, t) => 
        acc + (t.tipo === 'receita' ? t.valor : -t.valor), 0);
}

// Renderizar histórico e saldo
function render() {
    lista.innerHTML = '';
    state.transacoes.forEach(t => {
        const li = document.createElement('li');
        const left = document.createElement('div');
        left.innerHTML = `<strong>${t.categoria}</strong><br/><small>${new Date(t.data).toLocaleString()}</small>`;
        const right = document.createElement('div');
        right.textContent = (t.tipo === 'receita' ? '+ ' : '- ') + 'R$ ' + t.valor.toFixed(2);
        right.style.color = t.tipo === 'receita' ? '#059669' : '#dc2626';
        li.appendChild(left);
        li.appendChild(right);
        lista.appendChild(li);
    });
    
    const saldo = calcularSaldo();
    saldoDiv.textContent = "R$ " + saldo.toFixed(2);
    saldoDiv.style.color = saldo >= 0 ? '#059669' : '#dc2626';
    
    renderGraficos();
}

// Atualizar gráficos
function renderGraficos() {
    // Despesas por categoria (somente despesas)
    const despesas = state.transacoes.filter(t => t.tipo === 'despesa');
    const categorias = {};
    despesas.forEach(d => {
        categorias[d.categoria] = (categorias[d.categoria] || 0) + d.valor;
    });

    const labelsCat = Object.keys(categorias);
    const valoresCat = Object.values(categorias);

    if (chartCategorias) {
        chartCategorias.destroy();
    }
    
    if (labelsCat.length > 0) {
        chartCategorias = new Chart(ctxCategorias, {
            type: 'pie',
            data: {
                labels: labelsCat,
                datasets: [{
                    data: valoresCat,
                    backgroundColor: [
                        '#ef4444', '#f97316', '#eab308', '#22c55e',
                        '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'
                    ]
                }]
            },
            options: {
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Despesas por Categoria'
                    }
                }
            }
        });
    } else {
        // Se não houver despesas
        ctxCategorias.clearRect(0, 0, ctxCategorias.canvas.width, ctxCategorias.canvas.height);
    }

    // Evolução do saldo
    let saldoAcumulado = 0;
    const datas = [];
    const valoresSaldo = [];
    
    state.transacoes.forEach(t => {
        saldoAcumulado += t.tipo === 'receita' ? t.valor : -t.valor;
        datas.push(new Date(t.data).toLocaleDateString());
        valoresSaldo.push(saldoAcumulado);
    });

    if (chartSaldo) {
        chartSaldo.destroy();
    }
    
    chartSaldo = new Chart(ctxSaldo, {
        type: 'line',
        data: {
            labels: datas.length ? datas : ['início'],
            datasets: [{
                label: 'Saldo',
                data: valoresSaldo.length ? valoresSaldo : [0],
                fill: true,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Data'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Saldo (R$)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Evolução do Saldo'
                }
            }
        }
    });
}

// Simular dados (adiciona várias transações com efeito visual)
btnSimular.addEventListener('click', () => {
    // Amostra de transações para simular
    const amostra = [
        { tipo: 'receita', valor: 2000, categoria: 'salário' },
        { tipo: 'despesa', valor: 150, categoria: 'supermercado' },
        { tipo: 'despesa', valor: 60, categoria: 'transporte' },
        { tipo: 'despesa', valor: 80, categoria: 'lazer' },
        { tipo: 'despesa', valor: 200, categoria: 'aluguel' },
        { tipo: 'receita', valor: 150, categoria: 'freelance' },
        { tipo: 'despesa', valor: 40, categoria: 'assinatura' },
        { tipo: 'despesa', valor: 120, categoria: 'restaurante' },
    ];

    // Limpar antes de simular para visual mais claro
    state.transacoes = [];
    saveState();
    render();

    let i = 0;
    const timer = setInterval(() => {
        if (i >= amostra.length) {
            clearInterval(timer);
            return;
        }
        
        const item = amostra[i];
        const trans = {
            id: makeId(),
            valor: item.valor,
            tipo: item.tipo,
            categoria: item.categoria,
            data: new Date(Date.now() + i * 60000).toISOString()
        };
        
        state.transacoes.push(trans);
        saveState();
        render();
        i++;
    }, 600); // Adiciona tempo para efeito visual
});

// Limpar dados
btnLimpar.addEventListener('click', () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) return;
    
    state.transacoes = [];
    saveState();
    render();
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    // Iniciar animação da moeda
    startCoinAnimation();
    
    // Ocultar a tela de splash após 3 segundos
    const splash = document.querySelector('.splash-screen');
    setTimeout(() => {
        splash.classList.add('hidden');
        setTimeout(() => {
            splash.style.display = 'none';
            stopCoinAnimation(); // Parar a animação quando a splash some
        }, 500);
    }, 3000);
    
    // Renderizar dados iniciais
    render();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service Worker registrado com sucesso"))
    .catch(err => console.log("Erro ao registrar Service Worker:", err));
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      console.log('Service Worker registrado com sucesso:', registration.scope);
    }, function(err) {
      console.log('Falha no registro do Service Worker:', err);
    });
  });
}
