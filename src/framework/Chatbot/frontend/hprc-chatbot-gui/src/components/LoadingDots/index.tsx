import React from "react";
import styled, { keyframes } from 'styled-components';

const bounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
`;

const DotsContainer = styled.span`
  display: inline-flex;
  gap: 4px;
`;

const Dot = styled.span`
  width: 4px;
  height: 4px;
  background-color: currentColor;
  border-radius: 50%;
  display: inline-block;
  animation: ${bounce} 1.4s infinite ease-in-out both;

  &:nth-child(1) { animation-delay: -0.32s; }
  &:nth-child(2) { animation-delay: -0.16s; }
`;

export const Dots = () => (
  <DotsContainer>
    <Dot />
    <Dot />
    <Dot />
  </DotsContainer>
);
