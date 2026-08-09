// 键盘输入管理：仅处理左右方向键（A/D 作为备选）
export class Input {
  constructor() {
    this.left = false;
    this.right = false;
    this.anyPressed = false; // 用于"按任意键开始"

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  _onKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.right = true;
    this.anyPressed = true;
    // 阻止方向键导致页面滚动
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault();
    }
  }

  _onKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.right = false;
  }

  consumeAnyPress() {
    const v = this.anyPressed;
    this.anyPressed = false;
    return v;
  }
}
