# Impressão sobre etiqueta pré-impressa — 90 × 60 mm

O modo **etiqueta pré-impressa** imprime somente:

- nome/modelo do veículo;
- chapa;
- motor;
- QR Code.

O fundo, o logotipo, os ícones e os textos fixos já devem estar impressos pela gráfica.

## Posições oficiais

As posições foram ajustadas para coincidir com o desenho aprovado de 90 × 60 mm:

- Veículo: `x 16,50 mm`, `y 26,70 mm`, área `25,60 × 4,80 mm`;
- Chapa: `x 16,50 mm`, `y 35,05 mm`, área `25,60 × 4,85 mm`;
- Motor: `x 16,50 mm`, `y 43,75 mm`, área `25,60 × 4,85 mm`;
- QR: `x 47,70 mm`, `y 4,30 mm`, área `35,90 × 35,90 mm`.

## Configuração da impressora

- Papel personalizado: **90 × 60 mm**;
- Escala: **100% / tamanho real**;
- Margens: **nenhuma**;
- Desativar “Ajustar”, “Encolher” e “Dimensionar à página”.

## Calibração fina

Cada impressora pode deslocar alguns milímetros. Para mover todos os dados juntos sem alterar o desenho, edite estas variáveis em `src/utils/etiqueta-template.js`:

```css
:root {
  --offset-x: 0mm;
  --offset-y: 0mm;
}
```

Exemplo: se tudo sair 1 mm para a esquerda e 0,5 mm para cima:

```css
:root {
  --offset-x: 1mm;
  --offset-y: 0.5mm;
}
```

Antes de produzir em quantidade, faça uma impressão de teste sobre uma folha comum posicionada junto da etiqueta e confira contra a luz.
