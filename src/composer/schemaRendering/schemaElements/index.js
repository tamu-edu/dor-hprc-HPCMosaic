import Text from "./Text";
import Select from "./Select";
import RowContainer from "./RowContainer";
import { CollapsibleRowContainer, CollapsibleColContainer } from "./CollapsibleContainer";
import RadioGroup from "./RadioGroup";
import Unit from "./Unit";
import UnknownElement from "./UnknownElement";
import TextArea from "./TextArea";
import StaticText from "./StaticText";

export {
	Text,
	Select,
	RowContainer,
	RadioGroup,
	Unit,
	UnknownElement,
	TextArea,
	StaticText,
	CollapsibleRowContainer,
	CollapsibleColContainer
}

export const componentsMap = {
	text: Text,
	select: Select,
	rowContainer: RowContainer,
	radioGroup: RadioGroup,
	unit: Unit,
	textarea: TextArea,
	staticText: StaticText,
	collapsibleRowContainer: CollapsibleRowContainer,
	collapsibleColContainer: CollapsibleColContainer
};

export const Containers = ["rowContainer", "collapsibleRowContainer", "collapsibleColContainer"];
