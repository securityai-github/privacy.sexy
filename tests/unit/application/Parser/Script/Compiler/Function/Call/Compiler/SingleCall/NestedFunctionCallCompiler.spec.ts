import { expect, describe, it } from 'vitest';
import { createSharedFunctionStubWithCalls, createSharedFunctionStubWithCode } from '@tests/unit/shared/Stubs/SharedFunctionStub';
import { NestedFunctionCallCompiler } from '@/application/Parser/Script/Compiler/Function/Call/Compiler/SingleCall/Strategies/NestedFunctionCallCompiler';
import type { ArgumentCompiler } from '@/application/Parser/Script/Compiler/Function/Call/Compiler/SingleCall/Strategies/Argument/ArgumentCompiler';
import { ArgumentCompilerStub } from '@tests/unit/shared/Stubs/ArgumentCompilerStub';
import { FunctionCallStub } from '@tests/unit/shared/Stubs/FunctionCallStub';
import { FunctionCallCompilationContextStub } from '@tests/unit/shared/Stubs/FunctionCallCompilationContextStub';
import { SingleCallCompilerStub } from '@tests/unit/shared/Stubs/SingleCallCompilerStub';
import { CompiledCodeStub } from '@tests/unit/shared/Stubs/CompiledCodeStub';
import type { FunctionCall } from '@/application/Parser/Script/Compiler/Function/Call/FunctionCall';
import type { CompiledCode } from '@/application/Parser/Script/Compiler/Function/Call/Compiler/CompiledCode';
import { expectDeepThrowsError } from '@tests/shared/Assertions/ExpectDeepThrowsError';

describe('NestedFunctionCallCompiler', () => {
  describe('canCompile', () => {
    it('returns `true` for code body function', () => {
      // arrange
      const expected = true;
      const func = createSharedFunctionStubWithCalls()
        .withSomeCalls();
      const compiler = new NestedFunctionCallCompilerBuilder()
        .build();
      // act
      const actual = compiler.canCompile(func);
      // assert
      expect(actual).to.equal(expected);
    });
    it('returns `false` for non-code body function', () => {
      // arrange
      const expected = false;
      const func = createSharedFunctionStubWithCode();
      const compiler = new NestedFunctionCallCompilerBuilder()
        .build();
      // act
      const actual = compiler.canCompile(func);
      // assert
      expect(actual).to.equal(expected);
    });
  });
  describe('compile', () => {
    describe('argument compilation', () => {
      it('uses correct context', () => {
        // arrange
        const argumentCompiler = new ArgumentCompilerStub();
        const expectedContext = new FunctionCallCompilationContextStub();
        const { frontFunc, callToFrontFunc } = createSingleFuncCallingAnotherFunc();
        const compiler = new NestedFunctionCallCompilerBuilder()
          .withArgumentCompiler(argumentCompiler)
          .build();
        // act
        compiler.compileFunction(frontFunc, callToFrontFunc, expectedContext);
        // assert
        const calls = argumentCompiler.callHistory.filter((call) => call.methodName === 'createCompiledNestedCall');
        expect(calls).have.lengthOf(1);
        const [,,actualContext] = calls[0].args;
        expect(actualContext).to.equal(expectedContext);
      });
      it('uses correct parent call', () => {
        // arrange
        const argumentCompiler = new ArgumentCompilerStub();
        const expectedContext = new FunctionCallCompilationContextStub();
        const { frontFunc, callToFrontFunc } = createSingleFuncCallingAnotherFunc();
        const compiler = new NestedFunctionCallCompilerBuilder()
          .withArgumentCompiler(argumentCompiler)
          .build();
        // act
        compiler.compileFunction(frontFunc, callToFrontFunc, expectedContext);
        // assert
        const calls = argumentCompiler.callHistory.filter((call) => call.methodName === 'createCompiledNestedCall');
        expect(calls).have.lengthOf(1);
        const [,actualParentCall] = calls[0].args;
        expect(actualParentCall).to.equal(callToFrontFunc);
      });
      it('uses correct nested call', () => {
        // arrange
        const argumentCompiler = new ArgumentCompilerStub();
        const expectedContext = new FunctionCallCompilationContextStub();
        const { frontFunc, callToFrontFunc } = createSingleFuncCallingAnotherFunc();
        const compiler = new NestedFunctionCallCompilerBuilder()
          .withArgumentCompiler(argumentCompiler)
          .build();
        // act
        compiler.compileFunction(frontFunc, callToFrontFunc, expectedContext);
        // assert
        const calls = argumentCompiler.callHistory.filter((call) => call.methodName === 'createCompiledNestedCall');
        expect(calls).have.lengthOf(1);
        const [actualNestedCall] = calls[0].args;
        expect(actualNestedCall).to.deep.equal(callToFrontFunc);
      });
    });
    describe('re-compilation with compiled args', () => {
      it('uses correct context', () => {
        // arrange
        const singleCallCompilerStub = new SingleCallCompilerStub();
        const expectedContext = new FunctionCallCompilationContextStub()
          .withSingleCallCompiler(singleCallCompilerStub);
        const { frontFunc, callToFrontFunc } = createSingleFuncCallingAnotherFunc();
        const compiler = new NestedFunctionCallCompilerBuilder()
          .build();
        // act
        compiler.compileFunction(frontFunc, callToFrontFunc, expectedContext);
        // assert
        const calls = singleCallCompilerStub.callHistory.filter((call) => call.methodName === 'compileSingleCall');
        expect(calls).have.lengthOf(1);
        const [,actualContext] = calls[0].args;
        expect(expectedContext).to.equal(actualContext);
      });
      it('uses compiled nested call', () => {
        // arrange
        const expectedCall = new FunctionCallStub();
        const argumentCompilerStub = new ArgumentCompilerStub();
        argumentCompilerStub.createCompiledNestedCall = () => expectedCall;
        const singleCallCompilerStub = new SingleCallCompilerStub();
        const context = new FunctionCallCompilationContextStub()
          .withSingleCallCompiler(singleCallCompilerStub);
        const { frontFunc, callToFrontFunc } = createSingleFuncCallingAnotherFunc();
        const compiler = new NestedFunctionCallCompilerBuilder()
          .withArgumentCompiler(argumentCompilerStub)
          .build();
        // act
        compiler.compileFunction(frontFunc, callToFrontFunc, context);
        // assert
        const calls = singleCallCompilerStub.callHistory.filter((call) => call.methodName === 'compileSingleCall');
        expect(calls).have.lengthOf(1);
        const [actualNestedCall] = calls[0].args;
        expect(expectedCall).to.equal(actualNestedCall);
      });
    });
    it('flattens re-compiled functions', () => {
      // arrange
      const deepFunc1 = createSharedFunctionStubWithCode();
      const deepFunc2 = createSharedFunctionStubWithCalls();
      const callToDeepFunc1 = new FunctionCallStub().withFunctionName(deepFunc1.name);
      const callToDeepFunc2 = new FunctionCallStub().withFunctionName(deepFunc2.name);
      const singleCallCompilationScenario = new Map<FunctionCall, CompiledCode[]>([
        [callToDeepFunc1, [new CompiledCodeStub()]],
        [callToDeepFunc2, [new CompiledCodeStub(), new CompiledCodeStub()]],
      ]);
      const argumentCompiler = new ArgumentCompilerStub()
        .withScenario({ givenNestedFunctionCall: callToDeepFunc1, result: callToDeepFunc1 })
        .withScenario({ givenNestedFunctionCall: callToDeepFunc2, result: callToDeepFunc2 });
      const expectedFlattenedCodes = [...singleCallCompilationScenario.values()].flat();
      const frontFunc = createSharedFunctionStubWithCalls()
        .withCalls(callToDeepFunc1, callToDeepFunc2);
      const callToFrontFunc = new FunctionCallStub().withFunctionName(frontFunc.name);
      const singleCallCompilerStub = new SingleCallCompilerStub()
        .withCallCompilationScenarios(singleCallCompilationScenario);
      const expectedContext = new FunctionCallCompilationContextStub()
        .withSingleCallCompiler(singleCallCompilerStub);
      const compiler = new NestedFunctionCallCompilerBuilder()
        .withArgumentCompiler(argumentCompiler)
        .build();
      // act
      const actualCodes = compiler.compileFunction(frontFunc, callToFrontFunc, expectedContext);
      // assert
      expect(actualCodes).have.lengthOf(expectedFlattenedCodes.length);
      expect(actualCodes).to.have.members(expectedFlattenedCodes);
    });
    describe('error handling', () => {
      it('handles argument compiler errors', () => {
        // arrange
        const argumentCompilerError = new Error('Test error');
        const argumentCompilerStub = new ArgumentCompilerStub();
        argumentCompilerStub.createCompiledNestedCall = () => {
          throw argumentCompilerError;
        };
        const { frontFunc, callToFrontFunc } = createSingleFuncCallingAnotherFunc();
        const expectedError = new AggregateError(
          [argumentCompilerError],
          `Error with call to "${callToFrontFunc.functionName}" function from "${callToFrontFunc.functionName}" function`,
        );
        const compiler = new NestedFunctionCallCompilerBuilder()
          .withArgumentCompiler(argumentCompilerStub)
          .build();
        // act
        const act = () => compiler.compileFunction(
          frontFunc,
          callToFrontFunc,
          new FunctionCallCompilationContextStub(),
        );
        // assert
        expectDeepThrowsError(act, expectedError);
      });
      it('handles single call compiler errors', () => {
        // arrange
        const singleCallCompilerError = new Error('Test error');
        const singleCallCompiler = new SingleCallCompilerStub();
        singleCallCompiler.compileSingleCall = () => {
          throw singleCallCompilerError;
        };
        const context = new FunctionCallCompilationContextStub()
          .withSingleCallCompiler(singleCallCompiler);
        const { frontFunc, callToFrontFunc } = createSingleFuncCallingAnotherFunc();
        const expectedError = new AggregateError(
          [singleCallCompilerError],
          `Error with call to "${callToFrontFunc.functionName}" function from "${callToFrontFunc.functionName}" function`,
        );
        const compiler = new NestedFunctionCallCompilerBuilder()
          .build();
        // act
        const act = () => compiler.compileFunction(
          frontFunc,
          callToFrontFunc,
          context,
        );
        // assert
        expectDeepThrowsError(act, expectedError);
      });
    });
  });
});

function createSingleFuncCallingAnotherFunc() {
  const deepFunc = createSharedFunctionStubWithCode();
  const callToDeepFunc = new FunctionCallStub().withFunctionName(deepFunc.name);
  const frontFunc = createSharedFunctionStubWithCalls().withCalls(callToDeepFunc);
  const callToFrontFunc = new FunctionCallStub().withFunctionName(frontFunc.name);
  return {
    deepFunc,
    frontFunc,
    callToFrontFunc,
    callToDeepFunc,
  };
}

class NestedFunctionCallCompilerBuilder {
  private argumentCompiler: ArgumentCompiler = new ArgumentCompilerStub();

  public withArgumentCompiler(argumentCompiler: ArgumentCompiler): this {
    this.argumentCompiler = argumentCompiler;
    return this;
  }

  public build(): NestedFunctionCallCompiler {
    return new NestedFunctionCallCompiler(
      this.argumentCompiler,
    );
  }
}
