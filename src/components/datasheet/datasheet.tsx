import React, { MutableRefObject } from 'react'
import { observer } from "mobx-react";
import Spreadsheet from "react-spreadsheet";
import { DataSheetState } from '../../context/editor_context';
import { Box, Button, ButtonGroup, FormControl, FormLabel, HStack, Input, Popover, PopoverArrow, PopoverCloseButton, PopoverContent, PopoverTrigger, Stack, useDisclosure } from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { SplootDataFieldDeclaration } from '../../language/types/dataset/field_declaration';


interface TextInputProps{
  id: string,
  label: string;
  defaultValue: string;
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>((props, ref) => {
  return (
    <FormControl>
      <FormLabel htmlFor={props.id}>{props.label}</FormLabel>
      <Input ref={ref} id={props.id} {...props} />
    </FormControl>
  )
})

const Form = ({ firstFieldRef, onCancel, onSave }) => {
  let ref = firstFieldRef as MutableRefObject<HTMLInputElement>;
  return (
    <Stack spacing={4}>
      <TextInput
        label="Column name"
        id="column-name"
        ref={firstFieldRef}
        defaultValue="New Column"
      />
      <ButtonGroup d="flex" justifyContent="flex-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button  colorScheme="teal" onClick={() => onSave(ref.current.value)}>
          Add
        </Button>
      </ButtonGroup>
    </Stack>
  )
}

const AddColumnForm = ({addColumn}) => {
  const { onOpen, onClose, isOpen } = useDisclosure()
  const firstFieldRef = React.useRef(null)

  return (
    <Popover
      isOpen={isOpen}
      initialFocusRef={firstFieldRef}
      onOpen={onOpen}
      onClose={onClose}
      placement="right"
      closeOnBlur={true}
    >
      <PopoverTrigger>
        <Button size="xs" colorScheme='gray' variant='outline' leftIcon={<AddIcon fontSize={8}/>} mt={0.5}>
          Column
        </Button>
      </PopoverTrigger>
      <PopoverContent p={5}>
        <PopoverArrow />
        <PopoverCloseButton />
        <Form firstFieldRef={firstFieldRef} onCancel={onClose} onSave={(newColumnName: string) => {
          addColumn(newColumnName);
          onClose();
        }}/>
      </PopoverContent>
    </Popover>
  );
}


interface DataSheetEditorProps {
  dataSheetState: DataSheetState;
}

@observer
export class DataSheetEditor extends React.Component<DataSheetEditorProps> {
  render() {
    let {dataSheetState} = this.props;
    let fields = dataSheetState.dataSheetNode.getFieldDeclarations();
    let columnLabels = fields.map(fieldDec => fieldDec.getName());
    let columnIds = fields.map(fieldDec => fieldDec.getKey());

    const data = dataSheetState.dataSheetNode.getRows().map(row => {
      return row.getValuesAsList(columnLabels);
    });

    return (
      <>
        <HStack align='start'>
          <Spreadsheet data={data} columnLabels={columnLabels}/>
          <Box>
            <AddColumnForm addColumn={this.addColumn} />
          </Box>
        </HStack>
        <Box>
          <Button size="xs" colorScheme='gray' variant='outline' leftIcon={<AddIcon fontSize={8}/>} mt={0.5} onClick={this.addRow}>
            Row
          </Button>
        </Box>
      </>
    );
  }

  addRow = () => {
    let {dataSheetState} = this.props;
    dataSheetState.dataSheetNode.addRow();
  }

  addColumn = (name: string) => {
    let {dataSheetState} = this.props;
    let node = dataSheetState.dataSheetNode;
    let existingKeys = new Set<string>()
    node.getFieldDeclarations().forEach(dec => {
      existingKeys.add(dec.getKey());
    });
    let key = '';
    let unique = false;
    let count = 0;
    let length = 3;
    while (!unique) {
      if (count > 10) {
        length += 1;
        count = 0;
      }
      key = generateRandomKey(length);
      unique = !existingKeys.has(key);
      count += 1;
    }
    let dec = new SplootDataFieldDeclaration(null, key, name);
    node.addFieldDeclaration(dec);
  }
}

function generateRandomKey(length: number) {
  var result           = 'k'; // make sure it starts with a letter
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}