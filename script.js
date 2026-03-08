'use strict';

(function () {
  const expressionEl = document.getElementById('expression');
  const resultEl = document.getElementById('result');

  let currentInput = '';
  let justEvaluated = false;

  const OPERATORS = ['+', '-', '×', '÷', '%'];

  function updateDisplay(expr, res) {
    expressionEl.textContent = expr || '';
    resultEl.textContent = res;

    resultEl.classList.remove('small', 'error');
    if (typeof res === 'string' && (res === 'Error' || res.startsWith('Cannot'))) {
      resultEl.classList.add('error');
    } else if (String(res).length > 9) {
      resultEl.classList.add('small');
    }
  }

  function isOperator(ch) {
    return OPERATORS.includes(ch);
  }

  function lastChar() {
    return currentInput.slice(-1);
  }

  function appendValue(value) {
    if (justEvaluated) {
      if (isOperator(value)) {
        justEvaluated = false;
      } else {
        currentInput = '';
        justEvaluated = false;
      }
    }

    if (isOperator(value)) {
      if (currentInput === '' && value !== '-') {
        return;
      }
      if (isOperator(lastChar())) {
        currentInput = currentInput.slice(0, -1);
      }
    }

    if (value === '.') {
      const segments = currentInput.split(/[+\-×÷%]/);
      const currentSegment = segments[segments.length - 1];
      if (currentSegment.includes('.')) {
        return;
      }
      if (currentSegment === '') {
        currentInput += '0';
      }
    }

    currentInput += value;
    updateDisplay('', currentInput);
  }

  function clearAll() {
    currentInput = '';
    justEvaluated = false;
    updateDisplay('', '0');
  }

  function backspace() {
    if (justEvaluated) {
      clearAll();
      return;
    }
    currentInput = currentInput.slice(0, -1);
    updateDisplay('', currentInput || '0');
  }

  /* --- Safe arithmetic parser (no eval) --- */

  function tokenize(expr) {
    const tokens = [];
    let i = 0;
    while (i < expr.length) {
      const ch = expr[i];
      if (ch === ' ') { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        let num = '';
        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          num += expr[i++];
        }
        tokens.push({ type: 'number', value: parseFloat(num) });
      } else if ('+-×÷%'.includes(ch)) {
        tokens.push({ type: 'op', value: ch });
        i++;
      } else {
        throw new Error('Invalid character: ' + ch);
      }
    }
    return tokens;
  }

  function applyOp(left, op, right) {
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '×': return left * right;
      case '÷':
        if (right === 0) throw new Error('divide by zero');
        return left / right;
      case '%': return left % right;
      default: throw new Error('Unknown operator: ' + op);
    }
  }

  function precedence(op) {
    if (op === '+' || op === '-') return 1;
    if (op === '×' || op === '÷' || op === '%') return 2;
    return 0;
  }

  function parseExpression(tokens) {
    const values = [];
    const ops = [];

    function applyTop() {
      const right = values.pop();
      const left = values.pop();
      const op = ops.pop();
      values.push(applyOp(left, op, right));
    }

    let i = 0;
    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok.type === 'number') {
        values.push(tok.value);
        i++;
      } else if (tok.type === 'op') {
        if (tok.value === '-' && (i === 0 || tokens[i - 1].type === 'op')) {
          i++;
          if (i >= tokens.length || tokens[i].type !== 'number') {
            throw new Error('Invalid expression');
          }
          values.push(-tokens[i].value);
          i++;
        } else {
          while (ops.length > 0 && precedence(ops[ops.length - 1]) >= precedence(tok.value)) {
            applyTop();
          }
          ops.push(tok.value);
          i++;
        }
      }
    }

    while (ops.length > 0) {
      applyTop();
    }

    if (values.length !== 1) throw new Error('Invalid expression');
    return values[0];
  }

  function safeCalculate(input) {
    const tokens = tokenize(input);
    if (tokens.length === 0) return null;
    if (tokens[tokens.length - 1].type === 'op') return null;
    return parseExpression(tokens);
  }

  /* --- end parser --- */

  function evaluate() {
    if (currentInput === '') return;

    const expressionDisplay = currentInput;

    try {
      const result = safeCalculate(currentInput);

      if (result === null) return;

      if (!isFinite(result)) {
        updateDisplay(expressionDisplay + ' =', 'Cannot divide by zero');
        currentInput = '';
        justEvaluated = true;
        return;
      }

      const resultStr = parseFloat(result.toPrecision(12)).toString();

      updateDisplay(expressionDisplay + ' =', resultStr);
      currentInput = resultStr;
      justEvaluated = true;
    } catch (e) {
      const msg = e.message === 'divide by zero' ? 'Cannot divide by zero' : 'Error';
      updateDisplay(expressionDisplay + ' =', msg);
      currentInput = '';
      justEvaluated = true;
    }
  }

  function handleButtonClick(e) {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const action = btn.dataset.action;
    const value = btn.dataset.value;

    if (action === 'clear') {
      clearAll();
    } else if (action === 'backspace') {
      backspace();
    } else if (action === 'equals') {
      evaluate();
    } else if (value !== undefined) {
      appendValue(value);
    }
  }

  const keyMap = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    '.': '.',
    '+': '+',
    '-': '-',
    '*': '×',
    'x': '×',
    'X': '×',
    '/': '÷',
    '%': '%',
  };

  function handleKeydown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const key = e.key;

    if (keyMap[key] !== undefined) {
      e.preventDefault();
      appendValue(keyMap[key]);
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      evaluate();
    } else if (key === 'Backspace') {
      e.preventDefault();
      backspace();
    } else if (key === 'Escape' || key === 'Delete') {
      e.preventDefault();
      clearAll();
    }
  }

  document.querySelector('.buttons').addEventListener('click', handleButtonClick);
  document.addEventListener('keydown', handleKeydown);

  updateDisplay('', '0');
})();
