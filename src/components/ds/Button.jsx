import styled, { css } from "styled-components";

const Button = styled.button`
  padding: 10px;
  border-radius: 8px;
  border: 0;
  color: white;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  ${(props) => {
    switch (props.variant) {
      case "primary": {
        return css`
          background: #01a39b;
        `;
      }
      case "secondary": {
        return css`
          background: #161616;
        `;
      }
      case "outline": {
        return css`
          background: transparent;
          border: 1px solid #01a39b;
        `;
      }
      case "ghost": {
        return css`
          background: transparent;
          border: none;
        `;
      }
      default:
        return css`
          background-color: #01a39b;
        `;
    }
  }}
`;

export default Button;
